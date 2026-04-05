import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: NextRequest) {
  const bookingId = request.nextUrl.searchParams.get("id");
  if (!bookingId) {
    return NextResponse.json({ error: "Missing booking ID" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch booking from DB
  const { data: booking, error } = await supabase
    .from("course_bookings")
    .select(`
      *,
      course_sessions (date_iso, label_de, instructor_name, start_time, duration_minutes, address),
      course_templates (title, course_label_de, course_key)
    `)
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Fetch Stripe details if we have a checkout session
  let stripeDetails: Record<string, unknown> | null = null;

  if (booking.stripe_checkout_session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(booking.stripe_checkout_session_id, {
        expand: [
          "payment_intent",
          "payment_intent.payment_method",
          "payment_intent.latest_charge",
          "payment_intent.latest_charge.balance_transaction",
          "customer",
          "total_details",
        ],
      });

      const paymentIntent = session.payment_intent as Stripe.PaymentIntent | null;
      const paymentMethod = paymentIntent?.payment_method as Stripe.PaymentMethod | null;
      const latestCharge = paymentIntent?.latest_charge as Stripe.Charge | null;
      const balanceTransaction = latestCharge?.balance_transaction as Stripe.BalanceTransaction | null;
      const customer = session.customer as Stripe.Customer | null;

      // Extract payment method details. When there is no PaymentIntent at all
      // (e.g. a 100% discount booking with amountTotal = 0) Stripe never
      // attaches a payment method, so we return null instead of {} — the
      // client renders "Keine Stripe-Zahlung" in that case.
      let paymentMethodInfo: Record<string, unknown> | null = null;
      if (paymentMethod) {
        paymentMethodInfo = {
          type: paymentMethod.type,
          card: paymentMethod.card ? {
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            exp_month: paymentMethod.card.exp_month,
            exp_year: paymentMethod.card.exp_year,
            funding: paymentMethod.card.funding,
            country: paymentMethod.card.country,
          } : null,
          klarna: paymentMethod.klarna || null,
          sepa_debit: paymentMethod.sepa_debit ? {
            bank_code: paymentMethod.sepa_debit.bank_code,
            last4: paymentMethod.sepa_debit.last4,
            country: paymentMethod.sepa_debit.country,
          } : null,
          sofort: paymentMethod.sofort || null,
          paypal: paymentMethod.paypal || null,
        };
      }

      // Extract Klarna installment info from charge payment_method_details
      let klarnaDetails = null;
      if (latestCharge?.payment_method_details?.type === "klarna") {
        const klarnaInfo = latestCharge.payment_method_details.klarna;
        klarnaDetails = {
          payment_method_category: klarnaInfo?.payment_method_category || null,
          preferred_locale: klarnaInfo?.preferred_locale || null,
        };
      }

      // Extract fees from balance transaction
      let fees: { amount: number; description: string; type: string }[] = [];
      if (balanceTransaction?.fee_details) {
        fees = balanceTransaction.fee_details.map((fee) => ({
          amount: fee.amount,
          description: fee.description || "",
          type: fee.type,
        }));
      }

      // Extract discount/coupon info
      let discount = null;
      if (session.total_details?.amount_discount && session.total_details.amount_discount > 0) {
        discount = {
          amount: session.total_details.amount_discount,
        };
      }

      // Check for applied discounts/coupons via line items
      let coupon = null;
      let promoCode = null;
      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
          expand: ["data.discounts"],
        });
        if (lineItems.data.length > 0) {
          const discounts = (lineItems.data[0] as unknown as { discounts?: Array<{ discount?: { coupon?: { id: string; name: string; percent_off: number | null; amount_off: number | null }; promotion_code?: string } }> }).discounts || [];
          if (discounts.length > 0 && discounts[0].discount?.coupon) {
            coupon = {
              id: discounts[0].discount.coupon.id,
              name: discounts[0].discount.coupon.name,
              percent_off: discounts[0].discount.coupon.percent_off,
              amount_off: discounts[0].discount.coupon.amount_off,
            };
            if (discounts[0].discount.promotion_code) {
              try {
                const pc = await stripe.promotionCodes.retrieve(discounts[0].discount.promotion_code);
                promoCode = pc.code;
              } catch {
                // ignore
              }
            }
          }
        }
      } catch {
        // Ignore discount fetch errors
      }

      // Tax info
      let tax = null;
      if (session.total_details?.amount_tax && session.total_details.amount_tax > 0) {
        tax = {
          amount: session.total_details.amount_tax,
        };
      }

      stripeDetails = {
        sessionId: session.id,
        paymentIntentId: paymentIntent?.id || null,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        amountSubtotal: session.amount_subtotal,
        currency: session.currency,
        paymentMethod: paymentMethodInfo,
        klarnaDetails,
        fees,
        totalFees: balanceTransaction?.fee || 0,
        netAmount: balanceTransaction?.net || 0,
        discount,
        coupon,
        promoCode,
        tax,
        customerEmail: customer?.email || session.customer_details?.email || null,
        customerName: customer?.name || session.customer_details?.name || null,
        created: session.created,
        chargeId: latestCharge?.id || null,
        receiptUrl: latestCharge?.receipt_url || null,
        refunded: latestCharge?.refunded || false,
        amountRefunded: latestCharge?.amount_refunded || 0,
      };
    } catch (stripeErr) {
      console.error("Stripe fetch error:", stripeErr);
      stripeDetails = { error: "Failed to load Stripe details" };
    }
  }

  // Fetch Auszubildende profile if linked
  let auszubildendeProfile = null;
  if (booking.auszubildende_id) {
    const { data: profile } = await supabase
      .from("auszubildende")
      .select("*")
      .eq("id", booking.auszubildende_id)
      .single();
    auszubildendeProfile = profile;
  }

  return NextResponse.json({
    booking,
    stripeDetails,
    auszubildendeProfile,
  });
}
