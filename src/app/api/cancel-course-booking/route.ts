import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailHtml } from "@/lib/email-template";
import { archiveSentMessage } from "@/lib/gmail";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const CANCEL_SUBJECT = "Deine Buchung wurde storniert";

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

type EmailResult =
  | { sent: true }
  | { sent: false; reason: "no-recipient" | "resend-error"; detail?: string };

async function sendCancellationEmail(args: {
  to: string | null;
  firstName: string | null;
  courseName: string;
  sessionDate: string | null;
  creditNoteUrl: string | null;
}): Promise<EmailResult> {
  if (!args.to) return { sent: false, reason: "no-recipient" };

  const intro = args.sessionDate
    ? `Deine Buchung für den Kurs <strong>${args.courseName}</strong> am <strong>${args.sessionDate}</strong> wurde storniert.`
    : `Deine Buchung für den <strong>${args.courseName}</strong> wurde storniert.`;

  const infoRows = args.creditNoteUrl
    ? [{ label: "Stornorechnung", value: `<a href="${args.creditNoteUrl}" style="color:#0066FF;">Herunterladen</a>` }]
    : [];

  const html = buildEmailHtml({
    // Fall back to "Du" so a missing first_name never silently skips
    // the email (used to gate the entire send and was the cause of
    // multiple silent failures).
    firstName: args.firstName || "Du",
    intro,
    infoRows,
    note: "Falls Du Fragen hast, melde Dich gerne bei uns.",
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "EPHIA <customerlove@ephia.de>",
      to: args.to,
      subject: CANCEL_SUBJECT,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "<unreadable body>");
    console.error(
      `Resend rejected cancellation email for ${args.to}: ${res.status} ${detail}`,
    );
    return { sent: false, reason: "resend-error", detail };
  }

  // Mirror into Gmail Sent so the contact profile picks it up. Best-effort.
  try {
    await archiveSentMessage({ to: args.to, subject: CANCEL_SUBJECT, html });
  } catch (archiveErr) {
    console.error("archiveSentMessage failed (non-fatal):", archiveErr);
  }

  return { sent: true };
}

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

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

    // ── Refund path (Stripe) ────────────────────────────────────────────
    // Three possible cases:
    //   1. No checkout session at all (manual booking) → nothing to refund
    //   2. Checkout session but no payment_intent (€0 / 100% discount) → nothing to refund
    //   3. Checkout session WITH payment_intent → refund via credit note (if invoice) or direct refund
    let creditNoteUrl: string | null = null;
    let refunded = false;

    if (booking.stripe_checkout_session_id) {
      const checkoutSession = await stripeGet(
        `/checkout/sessions/${booking.stripe_checkout_session_id}`,
      );
      const paymentIntentId = checkoutSession.payment_intent;

      if (paymentIntentId) {
        const paymentIntent = await stripeGet(`/payment_intents/${paymentIntentId}`);
        const invoiceId = paymentIntent.invoice;

        if (invoiceId) {
          const creditNote = await stripePost("/credit_notes", {
            invoice: invoiceId,
            reason: "order_change",
            refund_amount: booking.amount_paid || 0,
          });
          creditNoteUrl = creditNote.pdf || null;
        } else {
          await stripePost("/refunds", { payment_intent: paymentIntentId });
        }
        refunded = true;
      }
    }

    // ── Persist + free seat ─────────────────────────────────────────────
    await supabase
      .from("course_bookings")
      .update({
        status: "cancelled",
        ...(creditNoteUrl ? { stripe_credit_note_url: creditNoteUrl } : {}),
      })
      .eq("id", bookingId);

    if (booking.session_id) {
      await supabase.rpc("decrement_booked_seats", { p_session_id: booking.session_id });
    }

    // ── Always attempt cancellation email ───────────────────────────────
    const courseName =
      booking.course_templates?.course_label_de ||
      booking.course_templates?.title ||
      "Kurs";
    const sessionDate = booking.course_sessions?.label_de || null;

    const emailResult = await sendCancellationEmail({
      to: booking.email,
      firstName: booking.first_name,
      courseName,
      sessionDate,
      creditNoteUrl,
    });

    return NextResponse.json({
      success: true,
      refunded,
      creditNoteUrl,
      email: emailResult,
    });
  } catch (err: unknown) {
    console.error("Cancel course booking error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
