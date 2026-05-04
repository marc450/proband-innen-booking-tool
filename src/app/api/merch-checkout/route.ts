import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isPickupOpen,
  isProductPickupEligible,
} from "@/lib/merch-pickup";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;

// Flat shipping for V1: €2.90. Keeping this server-side and using it as
// the Stripe fixed_amount for the shipping_option so the customer never
// sees a different number than what they pay.
const SHIPPING_GROSS_CENTS = 290;
const SHIPPING_LABEL = "Versand";
const SHIPPING_DELIVERY_MIN_DAYS = 3;
const SHIPPING_DELIVERY_MAX_DAYS = 7;

// Hard cap per checkout — mirrors MAX_QUANTITY_PER_ORDER on the
// purchase-panel UI. Belt-and-braces: even if a tampered client tries
// quantity=999 we never let one order drain all stock.
const MAX_QUANTITY_PER_ORDER = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      variantId,
      isDoctor,
      quantity: rawQuantity,
      pickupAtEvent: rawPickupAtEvent,
    } = body as {
      variantId?: string;
      isDoctor?: boolean;
      quantity?: number;
      pickupAtEvent?: boolean;
    };

    // Name, email, phone, address are collected by Stripe Checkout (see
    // shipping_address_collection + phone_number_collection below); the
    // pre-modal only gathers the Ärzt:in flag so it can be persisted on
    // the order row and drive the auszubildende contact_type.
    if (!variantId || typeof isDoctor !== "boolean") {
      return NextResponse.json({ error: "Variante und Ärzt:in-Angabe sind erforderlich." }, { status: 400 });
    }
    const pickupAtEventRequested = rawPickupAtEvent === true;

    // Quantity defaults to 1 (legacy callers + the cap's "one click"
    // flow). Coerce to a positive integer, clamp to [1, MAX] up front;
    // we still re-clamp against actual stock once we've loaded the
    // variant below.
    let quantity = Math.floor(Number(rawQuantity ?? 1));
    if (!Number.isFinite(quantity) || quantity < 1) quantity = 1;
    if (quantity > MAX_QUANTITY_PER_ORDER) quantity = MAX_QUANTITY_PER_ORDER;

    const admin = createAdminClient();

    // Load variant + parent product. We lock in the price from the DB so a
    // client-side tampered payload can never change what the customer pays.
    const { data: variant, error: vErr } = await admin
      .from("merch_product_variants")
      .select("id, name, color, size, price_gross_cents, stock, is_active, product_id, merch_products(slug, title, is_active)")
      .eq("id", variantId)
      .maybeSingle();

    if (vErr || !variant) {
      return NextResponse.json({ error: "Variante nicht gefunden." }, { status: 404 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product = Array.isArray((variant as any).merch_products) ? (variant as any).merch_products[0] : (variant as any).merch_products;
    if (!product?.is_active || !variant.is_active) {
      return NextResponse.json({ error: "Produkt nicht verfügbar." }, { status: 400 });
    }
    if (variant.stock <= 0) {
      return NextResponse.json({ error: "Ausverkauft." }, { status: 409 });
    }
    if (quantity > variant.stock) {
      return NextResponse.json(
        { error: `Nur noch ${variant.stock} auf Lager.` },
        { status: 409 },
      );
    }

    // Re-validate the community-event pickup choice server-side so a
    // tampered client can't claim pickup on a non-eligible product
    // (e.g. the cap) or sneak it past the cutoff once the event has
    // already started. If the request asks for pickup but the
    // server-side checks fail, we fall back to regular shipping
    // rather than rejecting outright — the buyer's intent ("I want
    // this product") still resolves to a successful checkout.
    const pickupAtEvent =
      pickupAtEventRequested &&
      isProductPickupEligible(product.slug) &&
      isPickupOpen();

    const origin = req.headers.get("origin") || "https://kurse.ephia.de";
    const successUrl = `${origin}/merch/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/merch/${product.slug}`;

    const variantLabel = [variant.color, variant.size].filter((x) => x && x !== "one-size").join(" / ");
    const productName = variantLabel ? `${product.title} (${variantLabel})` : product.title;

    // Build Stripe Checkout params.
    const params: Record<string, string> = {
      mode: "payment",
      customer_creation: "always",
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: "de",
      billing_address_collection: "required",
      "phone_number_collection[enabled]": "true",
      "automatic_tax[enabled]": "true",
      "tax_id_collection[enabled]": "true",
      "consent_collection[terms_of_service]": "required",
      "invoice_creation[enabled]": "true",
      // Surface the "Rabattcode hinzufügen" link on Stripe Checkout so
      // buyers can redeem any active promotion code from Stripe (same
      // codes we manage under Dashboard > Rabattcodes).
      allow_promotion_codes: "true",

      // Line item. price_gross_cents is the VAT-INCLUSIVE price (35,00 EUR
      // for the cap), so we tell Stripe the amount is "inclusive" and let
      // automatic_tax split the 19% DE VAT out on the receipt instead of
      // adding tax on top. Without this hint Stripe treats the price as
      // net, fails to match EPHIA's merch tax settings, and shows 0,00 €
      // tax. "txcd_99999999" is Stripe's "General - Tangible Goods" code
      // which covers apparel/caps/etc in the default DE configuration.
      "line_items[0][quantity]": String(quantity),
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(variant.price_gross_cents),
      "line_items[0][price_data][tax_behavior]": "inclusive",
      "line_items[0][price_data][product_data][name]": productName,
      "line_items[0][price_data][product_data][tax_code]": "txcd_99999999",

      // Metadata drives the stripe-webhook handler.
      "metadata[orderType]": "merch",
      "metadata[variantId]": variant.id,
      "metadata[productId]": variant.product_id,
      "metadata[productSlug]": product.slug,
      "metadata[productTitle]": product.title,
      "metadata[variantName]": variant.name,
      "metadata[variantColor]": variant.color || "",
      "metadata[variantSize]": variant.size || "",
      "metadata[isDoctor]": isDoctor ? "true" : "false",
      "metadata[quantity]": String(quantity),
      // itemUnitGrossCents = per-unit VAT-inclusive price; itemGrossCents
      // is the line-item total (unit × quantity). Webhook uses both:
      // unit + quantity for the merch_orders row, total for the receipt
      // amount sanity check.
      "metadata[itemUnitGrossCents]": String(variant.price_gross_cents),
      "metadata[itemGrossCents]": String(variant.price_gross_cents * quantity),
      "metadata[shippingGrossCents]": String(pickupAtEvent ? 0 : SHIPPING_GROSS_CENTS),
      "metadata[pickupAtEvent]": pickupAtEvent ? "true" : "false",
    };

    if (pickupAtEvent) {
      // Pickup orders skip Stripe's shipping flow entirely: no
      // shipping_address_collection (we don't need a delivery
      // address) and no shipping_options (no €2.90 line). Billing
      // address is still collected because Stripe needs it for the
      // tax-compliant invoice.
    } else {
      // Shipping address required.
      params["shipping_address_collection[allowed_countries][0]"] = "DE";
      params["shipping_address_collection[allowed_countries][1]"] = "AT";
      params["shipping_address_collection[allowed_countries][2]"] = "CH";

      // Fixed shipping rate (V1 — admin can swap for dynamic rates later).
      // Mark the 2,90 EUR as VAT-inclusive and tag with Stripe's shipping
      // tax_code ("txcd_92010001") so automatic_tax splits the VAT portion
      // consistently with the line item rather than treating shipping as
      // tax-free.
      params["shipping_options[0][shipping_rate_data][type]"] = "fixed_amount";
      params["shipping_options[0][shipping_rate_data][fixed_amount][amount]"] =
        String(SHIPPING_GROSS_CENTS);
      params["shipping_options[0][shipping_rate_data][fixed_amount][currency]"] = "eur";
      params["shipping_options[0][shipping_rate_data][display_name]"] = SHIPPING_LABEL;
      params["shipping_options[0][shipping_rate_data][tax_behavior]"] = "inclusive";
      params["shipping_options[0][shipping_rate_data][tax_code]"] = "txcd_92010001";
      params["shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]"] =
        "business_day";
      params["shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]"] =
        String(SHIPPING_DELIVERY_MIN_DAYS);
      params["shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]"] =
        "business_day";
      params["shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]"] =
        String(SHIPPING_DELIVERY_MAX_DAYS);
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    });

    const session = await res.json();
    if (!res.ok) {
      console.error("Stripe checkout session failed:", session);
      return NextResponse.json(
        { error: session?.error?.message || "Checkout konnte nicht gestartet werden." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("merch-checkout error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unerwarteter Fehler." },
      { status: 500 },
    );
  }
}
