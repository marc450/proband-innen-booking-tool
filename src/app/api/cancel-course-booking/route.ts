import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailHtml } from "@/lib/email-template";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;

async function stripePost(path: string, body: Record<string, string | number>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(
      Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)]))
    ).toString(),
  });
  return res.json();
}

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch booking with session and template info
    const { data: booking, error: fetchError } = await supabase
      .from("course_bookings")
      .select("*, course_sessions(date_iso, label_de, start_time), course_templates(title, course_label_de)")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Buchung nicht gefunden" }, { status: 404 });
    }

    if (booking.status === "cancelled" || booking.status === "refunded") {
      return NextResponse.json({ error: "Buchung ist bereits storniert" }, { status: 400 });
    }

    if (!booking.stripe_checkout_session_id) {
      // No Stripe session — just update status and free seat
      await supabase.from("course_bookings").update({ status: "cancelled" }).eq("id", bookingId);
      if (booking.session_id) {
        await supabase.rpc("decrement_booked_seats", { p_session_id: booking.session_id });
      }
      return NextResponse.json({ success: true, refunded: false });
    }

    // Get the Stripe checkout session to find the payment intent
    const checkoutSession = await stripeGet(`/checkout/sessions/${booking.stripe_checkout_session_id}`);
    const paymentIntentId = checkoutSession.payment_intent;

    if (!paymentIntentId) {
      // No payment was made — just cancel
      await supabase.from("course_bookings").update({ status: "cancelled" }).eq("id", bookingId);
      if (booking.session_id) {
        await supabase.rpc("decrement_booked_seats", { p_session_id: booking.session_id });
      }
      return NextResponse.json({ success: true, refunded: false });
    }

    // Get the payment intent to find the invoice
    const paymentIntent = await stripeGet(`/payment_intents/${paymentIntentId}`);
    const invoiceId = paymentIntent.invoice;

    let creditNoteUrl: string | null = null;

    if (invoiceId) {
      // Create credit note against the invoice (full refund)
      const creditNote = await stripePost("/credit_notes", {
        invoice: invoiceId,
        reason: "order_change",
        refund_amount: booking.amount_paid || 0,
      });
      creditNoteUrl = creditNote.pdf || null;
    } else {
      // No invoice — do a direct refund on the payment intent
      await stripePost("/refunds", {
        payment_intent: paymentIntentId,
      });
    }

    // Update booking status
    await supabase
      .from("course_bookings")
      .update({
        status: "cancelled",
        stripe_credit_note_url: creditNoteUrl,
      })
      .eq("id", bookingId);

    // Free up the seat
    if (booking.session_id) {
      await supabase.rpc("decrement_booked_seats", { p_session_id: booking.session_id });
    }

    // Send cancellation email
    if (booking.email && booking.first_name) {
      const courseName = booking.course_templates?.course_label_de || booking.course_templates?.title || "Kurs";
      const sessionDate = booking.course_sessions?.label_de || null;

      const intro = sessionDate
        ? `Deine Buchung für den Kurs <strong>${courseName}</strong> am <strong>${sessionDate}</strong> wurde storniert.`
        : `Deine Buchung für den <strong>${courseName}</strong> wurde storniert.`;

      const infoRows = creditNoteUrl
        ? [{ label: "Stornorechnung", value: `<a href="${creditNoteUrl}" style="color:#0066FF;">Herunterladen</a>` }]
        : [];

      const emailHtml = buildEmailHtml({
        firstName: booking.first_name,
        intro,
        infoRows,
        note: "Falls Du Fragen hast, melde Dich gerne bei uns.",
      });

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "EPHIA <customerlove@ephia.de>",
          to: booking.email,
          subject: "Deine Buchung wurde storniert",
          html: emailHtml,
        }),
      });
    }

    return NextResponse.json({
      success: true,
      refunded: true,
      creditNoteUrl,
    });
  } catch (err: unknown) {
    console.error("Cancel course booking error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
