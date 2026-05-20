import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendEmailViaResend } from "@/lib/post-purchase";
import { buildEmailHtml } from "@/lib/email-template";

// Creates a "Geschenk-Bestellung" (complimentary order): a merch_orders
// row with amount_paid_cents=0 and is_complimentary=true. Mirrors the
// stripe-webhook path (atomic stock decrement, optional Resend email)
// without going through Stripe. Used by Sophia and team to track free
// shirts so stock + history stay accurate.

async function assertStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role === "admin" || profile?.role === "nutzer") return user;
  return null;
}

interface CompOrderInput {
  variantId: string;
  quantity: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  reason: string;
  isDoctor?: boolean;
  shippingLine1?: string;
  shippingLine2?: string;
  shippingPostalCode?: string;
  shippingCity?: string;
  shippingCountry?: string;
  /** "pending" = noch nicht uebergeben, "shipped" = uebergeben/versendet */
  status?: "pending" | "shipped";
  /** Send a customer confirmation email via Resend. Default false. */
  sendConfirmationEmail?: boolean;
}

export async function POST(req: NextRequest) {
  const user = await assertStaff();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  let body: CompOrderInput;
  try {
    body = (await req.json()) as CompOrderInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const variantId = body.variantId;
  const quantity = Math.max(1, Math.floor(Number(body.quantity) || 1));
  const reason = (body.reason || "").trim();

  if (!variantId) {
    return NextResponse.json({ error: "variantId fehlt" }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "Grund / Anlass fehlt" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Pull variant + product snapshot for the merch_orders row.
  const { data: variant, error: variantErr } = await admin
    .from("merch_product_variants")
    .select(
      "id, product_id, name, color, size, stock, merch_products!inner(title)",
    )
    .eq("id", variantId)
    .single();
  if (variantErr || !variant) {
    return NextResponse.json({ error: "Variante nicht gefunden" }, { status: 404 });
  }
  if ((variant.stock ?? 0) < quantity) {
    return NextResponse.json(
      { error: `Nur noch ${variant.stock ?? 0} auf Lager.` },
      { status: 409 },
    );
  }

  // `merch_products!inner(title)` returns the product as a nested object or
  // array depending on PostgREST relationship hints — handle both shapes.
  const product = Array.isArray(variant.merch_products)
    ? variant.merch_products[0]
    : variant.merch_products;
  const productTitle = (product?.title as string) || "Merch";

  const status: "pending" | "shipped" =
    body.status === "shipped" ? "shipped" : "pending";

  const shipped_at = status === "shipped" ? new Date().toISOString() : null;

  const email = (body.email || "").trim().toLowerCase();

  const { data: order, error: insertErr } = await admin
    .from("merch_orders")
    .insert({
      variant_id: variant.id,
      product_id: variant.product_id,
      product_title: productTitle,
      variant_name: variant.name,
      variant_color: variant.color,
      variant_size: variant.size,
      quantity,
      first_name: body.firstName?.trim() || null,
      last_name: body.lastName?.trim() || null,
      email: email || "geschenk@ephia.de",
      phone: body.phone?.trim() || null,
      is_doctor: !!body.isDoctor,
      shipping_line1: body.shippingLine1?.trim() || null,
      shipping_line2: body.shippingLine2?.trim() || null,
      shipping_postal_code: body.shippingPostalCode?.trim() || null,
      shipping_city: body.shippingCity?.trim() || null,
      shipping_country: body.shippingCountry?.trim() || null,
      item_gross_cents: 0,
      shipping_gross_cents: 0,
      pickup_at_event: false,
      amount_paid_cents: 0,
      status,
      shipped_at,
      is_complimentary: true,
      complimentary_reason: reason,
    })
    .select("*")
    .single();

  if (insertErr || !order) {
    return NextResponse.json(
      { error: `Bestellung konnte nicht angelegt werden: ${insertErr?.message || "unknown"}` },
      { status: 500 },
    );
  }

  // Atomic stock decrement via the same RPC the Stripe webhook uses.
  const { error: stockErr } = await admin.rpc("merch_decrement_stock", {
    p_variant_id: variant.id,
    p_qty: quantity,
  });
  if (stockErr) {
    // Roll the order row back so the comp order isn't recorded against
    // stock we couldn't actually decrement (e.g. a race).
    await admin.from("merch_orders").delete().eq("id", order.id);
    return NextResponse.json(
      { error: `Lager konnte nicht reduziert werden: ${stockErr.message}` },
      { status: 409 },
    );
  }

  // Optional customer confirmation email. Off by default per Marc's
  // request, since Sophia often wants to write a personal note instead.
  if (body.sendConfirmationEmail && email && process.env.RESEND_API_KEY) {
    try {
      const variantLabel = [variant.color, variant.size]
        .filter((x) => x && x !== "one-size")
        .join(" / ");
      const html = buildEmailHtml({
        firstName: body.firstName?.trim() || "Du",
        intro:
          "wir haben eine kleine Aufmerksamkeit fuer Dich auf den Weg gebracht.",
        infoRows: [
          {
            label: "Produkt",
            value: `${productTitle}${variantLabel ? ` (${variantLabel})` : ""}${quantity > 1 ? ` × ${quantity}` : ""}`,
          },
        ],
      });
      await sendEmailViaResend(
        email,
        `Deine EPHIA-Bestellung: ${productTitle}`,
        html,
      );
    } catch (err) {
      console.error("Comp order email failed:", err);
    }
  }

  return NextResponse.json({ ok: true, order });
}
