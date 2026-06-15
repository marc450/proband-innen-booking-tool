import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailHtml } from "@/lib/email-template";
import { archiveSentMessage } from "@/lib/gmail";

/**
 * Admin-only: initiate a gated Umbuchung for an Auszubildende course booking.
 *
 * The move is NOT applied here. We persist a pending course_rebooking_request
 * and create a Stripe Checkout for the Umbuchungsgebühr (AGB Ziffer 6). The
 * doctor pays via the returned/emailed link; only then does the Stripe webhook
 * call apply_course_rebooking to move the booking and rebalance seats.
 *
 * Free moves (no fee, more than 14 days out) do NOT go through this route —
 * the client updates the booking directly, as before.
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SITE_URL = "https://ephia.de";

async function stripePost(endpoint: string, body: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) {
    throw new Error(`Stripe error: ${await res.text()}`);
  }
  return res.json();
}

// Verified admin check: hits the auth server (getUser) and the DB role, not a
// forgeable cookie. This route can move money, so it must not trust headers.
async function assertAdmin() {
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
  if (!profile || profile.role !== "admin") return null;
  return user;
}

export async function POST(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { bookingId, toSessionId, feeCents } = body as {
    bookingId?: string;
    toSessionId?: string;
    feeCents?: number;
  };

  if (!bookingId || !toSessionId) {
    return NextResponse.json(
      { error: "bookingId und toSessionId sind erforderlich." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(feeCents) || (feeCents as number) <= 0) {
    return NextResponse.json(
      { error: "feeCents muss eine positive ganze Zahl sein." },
      { status: 400 },
    );
  }
  const fee = feeCents as number;

  const admin = createAdminClient();

  // Load the booking being moved. It must currently sit in a session and carry
  // a Stripe customer (set on every course checkout) so we can bill the fee.
  const { data: booking, error: bErr } = await admin
    .from("course_bookings")
    .select(
      "id, session_id, first_name, last_name, email, stripe_customer_id, status, course_templates(course_label_de, title)",
    )
    .eq("id", bookingId)
    .single();

  if (bErr || !booking) {
    return NextResponse.json({ error: "Buchung nicht gefunden." }, { status: 404 });
  }
  if (!booking.session_id) {
    return NextResponse.json(
      { error: "Diese Buchung ist keinem Termin zugeordnet und kann nicht umgebucht werden." },
      { status: 400 },
    );
  }
  if (booking.session_id === toSessionId) {
    return NextResponse.json(
      { error: "Der neue Termin entspricht dem aktuellen Termin." },
      { status: 400 },
    );
  }
  if (!booking.email) {
    return NextResponse.json(
      { error: "Für diese Buchung ist keine E-Mail-Adresse hinterlegt." },
      { status: 400 },
    );
  }

  // Target session must exist. We intentionally do NOT require is_live: staff
  // need to rebook doctors onto future dates that aren't published to the
  // public funnel yet. The rebooking modal already surfaces such dates with a
  // "noch nicht live" hint, so the API must accept them too.
  const { data: toSession, error: sErr } = await admin
    .from("course_sessions")
    .select("id, label_de, date_iso, is_live")
    .eq("id", toSessionId)
    .single();
  if (sErr || !toSession) {
    return NextResponse.json({ error: "Zieltermin nicht verfügbar." }, { status: 400 });
  }

  // Persist the pending request first so its id can ride along in the Stripe
  // metadata; the webhook resolves the move from it after payment.
  const { data: request, error: rErr } = await admin
    .from("course_rebooking_requests")
    .insert({
      booking_id: booking.id,
      from_session_id: booking.session_id,
      to_session_id: toSessionId,
      fee_cents: fee,
      status: "pending",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (rErr || !request) {
    return NextResponse.json(
      { error: rErr?.message || "Umbuchung konnte nicht angelegt werden." },
      { status: 500 },
    );
  }

  const courseName =
    (booking.course_templates as { course_label_de?: string; title?: string } | null)
      ?.course_label_de ||
    (booking.course_templates as { title?: string } | null)?.title ||
    "EPHIA Kurs";

  // Create the Stripe Checkout for the fee. No courseKey metadata, so the
  // webhook will not mistake this for a new course booking.
  let checkout: { id: string; url: string };
  try {
    const params: Record<string, string> = {
      mode: "payment",
      // Land on the homepage, not /courses/success: this checkout pays a fee
      // and creates no course booking, so the post-purchase page would have
      // nothing to show. The confirmation email explains the next step.
      success_url: SITE_URL,
      cancel_url: SITE_URL,
      locale: "de",
      billing_address_collection: "required",
      "automatic_tax[enabled]": "true",
      "tax_id_collection[enabled]": "true",
      "invoice_creation[enabled]": "true",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(fee),
      "line_items[0][price_data][product_data][name]": `Umbuchungsgebühr: ${courseName}`,
      "line_items[0][price_data][product_data][description]":
        "Einmalige Umbuchungsgebühr für die Verlegung auf einen neuen Termin (AGB Ziffer 6).",
      "metadata[rebookingRequestId]": request.id,
    };
    if (booking.stripe_customer_id) {
      params.customer = booking.stripe_customer_id;
    } else {
      params.customer_creation = "always";
      params.customer_email = booking.email;
    }
    checkout = await stripePost("/checkout/sessions", params);
  } catch (err) {
    console.error("Rebooking checkout error:", err);
    // Roll the request back so a failed Stripe call doesn't leave an orphan.
    await admin.from("course_rebooking_requests").delete().eq("id", request.id);
    return NextResponse.json(
      { error: "Zahlungslink konnte nicht erstellt werden." },
      { status: 500 },
    );
  }

  await admin
    .from("course_rebooking_requests")
    .update({ stripe_checkout_session_id: checkout.id })
    .eq("id", request.id);

  // Email the payment link to the doctor (best effort).
  if (RESEND_API_KEY) {
    try {
      const feeEur = (fee / 100).toLocaleString("de-DE", {
        style: "currency",
        currency: "EUR",
      });
      const html = buildEmailHtml({
        firstName: booking.first_name || "Frau Kollegin, Herr Kollege",
        intro:
          `Du möchtest Deinen Platz im Kurs <strong>${courseName}</strong> auf einen neuen Termin verlegen. ` +
          `Dafür fällt eine einmalige Umbuchungsgebühr von <strong>${feeEur}</strong> an (AGB Ziffer 6). ` +
          `Sobald Deine Zahlung eingegangen ist, buchen wir Dich automatisch auf den neuen Termin um.`,
        buttons: [{ label: "Umbuchungsgebühr bezahlen", url: checkout.url }],
        note: "Der neue Termin wird erst nach Zahlungseingang verbindlich gebucht.",
      });
      const subject = `Umbuchung: ${courseName}`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "EPHIA <customerlove@ephia.de>",
          to: [booking.email],
          subject,
          html,
        }),
      });
      try {
        await archiveSentMessage({ to: booking.email, subject, html });
      } catch (archiveErr) {
        console.error("archiveSentMessage failed (non-fatal):", archiveErr);
      }
    } catch (emailErr) {
      console.error("Rebooking payment email failed (non-fatal):", emailErr);
    }
  }

  return NextResponse.json({ ok: true, paymentUrl: checkout.url, requestId: request.id });
}
