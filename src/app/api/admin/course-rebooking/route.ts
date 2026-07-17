import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildSessionChangeEmail,
  buildRebookingPaymentEmail,
  formatDateDe,
} from "@/lib/course-email-templates";
import { formatHoldDeadline } from "@/lib/run-rebooking-reminders";
import { buildCourseLineItem, type CourseVariant } from "@/lib/course-pricing";
import { archiveSentMessage } from "@/lib/gmail";

/**
 * Admin-only: initiate a gated Umbuchung for an Auszubildende course booking.
 *
 * The move can target another date of the SAME course, or a DIFFERENT course
 * template (Grundkurs -> Aufbaukurs). Cross-course moves carry an Aufpreis when
 * the target course is more expensive than what was originally paid; the
 * Aufpreis is computed server-side (never trusted from the client) and clamped
 * at >= 0 (downgrades are not refunded).
 *
 * The move is NOT applied here when money is due. We persist a pending
 * course_rebooking_request and the doctor pays the Umbuchungsgebühr + Aufpreis
 * via the emailed link; only then does the Stripe webhook call
 * apply_course_rebooking to move the booking (incl. template/type). When the
 * total is 0 € (same price, more than 14 days out) the move is applied
 * immediately here and a confirmation email is sent.
 *
 * The pending request IS the seat reservation (migration 154): creating it
 * frees the original seat for resale right away and holds the target seat, so
 * an unpaid Umbuchung no longer blocks a sellable seat. The hold has a
 * deadline; the payment page refuses a lapsed link, and the daily sweep
 * (/api/send-reminders) hands the held seat back.
 *
 * Same-course FREE moves do NOT go through this route — the client updates the
 * booking directly, as before.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const BOOKING_SITE_URL = "https://proband-innen.ephia.de";

const VALID_COURSE_TYPES: CourseVariant[] = ["Onlinekurs", "Praxiskurs", "Kombikurs"];

// How long a pending Umbuchung may hold its seats.
const HOLD_DAYS = 7;
// ... but never past this many days before the ORIGINAL course date.
const HOLD_STOP_DAYS_BEFORE_COURSE = 2;
// ... and always at least this long, so a doctor who rebooks right before her
// course still gets a usable window instead of an already-expired link.
const HOLD_MIN_HOURS = 24;

/**
 * Deadline for a seat hold: 7 days, capped at 2 days before the original course
 * date, floored at 24h. Once the deadline passes the reaper releases the target
 * seat and puts her back on the original date.
 *
 * The cap only applies while the original course is still AHEAD of her. Its
 * whole point is to not hold a seat past the date she would fall back to; when
 * that course has already happened (staff rebooking a no-show onto a later
 * date, the common case) there is nothing to fall back to and no reason to
 * rush her, so she gets the full 7 days.
 */
function holdExpiresAt(fromDateIso: string | null): Date {
  const now = Date.now();
  let expires = now + HOLD_DAYS * 24 * 60 * 60 * 1000;

  if (fromDateIso) {
    // Course days start at midnight Berlin; the exact hour doesn't matter at a
    // 2-day cap, so date-only arithmetic is close enough.
    const courseStart = new Date(`${fromDateIso}T00:00:00+02:00`).getTime();
    if (!Number.isNaN(courseStart) && courseStart > now) {
      const cap = courseStart - HOLD_STOP_DAYS_BEFORE_COURSE * 24 * 60 * 60 * 1000;
      expires = Math.min(expires, cap);
    }
  }

  return new Date(Math.max(expires, now + HOLD_MIN_HOURS * 60 * 60 * 1000));
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
  const { bookingId, toSessionId, feeCents, toTemplateId, toCourseType } = body as {
    bookingId?: string;
    toSessionId?: string;
    feeCents?: number;
    toTemplateId?: string;
    toCourseType?: string;
  };

  if (!bookingId || !toSessionId) {
    return NextResponse.json(
      { error: "bookingId und toSessionId sind erforderlich." },
      { status: 400 },
    );
  }
  // Umbuchungsgebühr (AGB Ziffer 6). May be 0 for a cross-course move that is
  // more than 14 days out but still carries an Aufpreis.
  if (!Number.isInteger(feeCents) || (feeCents as number) < 0) {
    return NextResponse.json(
      { error: "feeCents muss eine ganze Zahl >= 0 sein." },
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
      "id, session_id, template_id, course_type, amount_paid, first_name, last_name, email, stripe_customer_id, status, course_templates(course_label_de, title)",
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
  if (!booking.email) {
    return NextResponse.json(
      { error: "Für diese Buchung ist keine E-Mail-Adresse hinterlegt." },
      { status: 400 },
    );
  }

  // Cross-course when a target template is given and differs from the booking's
  // current one. Same-template moves leave template/type untouched.
  const isCrossCourse = !!toTemplateId && toTemplateId !== booking.template_id;

  if (!isCrossCourse && booking.session_id === toSessionId) {
    return NextResponse.json(
      { error: "Der neue Termin entspricht dem aktuellen Termin." },
      { status: 400 },
    );
  }

  // Resolve the target course type (defaults to the current one) and compute the
  // Aufpreis server-side. Never trust a client-supplied surcharge.
  let surcharge = 0;
  let targetTemplateId: string | null = null;
  let targetCourseType: string | null = null;
  let targetCourseName: string | null = null;

  if (isCrossCourse) {
    const courseType = (toCourseType as CourseVariant) || (booking.course_type as CourseVariant);
    if (!VALID_COURSE_TYPES.includes(courseType)) {
      return NextResponse.json(
        { error: "Ungültiger Kurstyp für den Zielkurs." },
        { status: 400 },
      );
    }

    const { data: toTemplate, error: tErr } = await admin
      .from("course_templates")
      .select(
        "id, course_key, course_label_de, title, name_online, name_praxis, name_kombi, description_online, description_praxis, description_kombi, price_gross_online_cents, price_gross_praxis_cents, price_gross_kombi_cents, price_gross_premium_cents",
      )
      .eq("id", toTemplateId)
      .single();
    if (tErr || !toTemplate) {
      return NextResponse.json({ error: "Zielkurs nicht gefunden." }, { status: 400 });
    }

    const lineItem = buildCourseLineItem({
      template: toTemplate,
      courseKey: toTemplate.course_key || "",
      courseType,
    });
    const targetPrice = lineItem.grossPriceCents || 0;
    // Keep on downgrade: the Aufpreis is only ever charged, never refunded.
    surcharge = Math.max(0, targetPrice - (booking.amount_paid || 0));
    targetTemplateId = toTemplate.id;
    targetCourseType = courseType;
    targetCourseName = toTemplate.course_label_de || toTemplate.title || "EPHIA Kurs";
  }

  // Target session must exist. For a cross-course move it must belong to the
  // target template. We intentionally do NOT require is_live: staff rebook onto
  // future dates that aren't published to the public funnel yet.
  const { data: toSession, error: sErr } = await admin
    .from("course_sessions")
    .select("id, template_id, label_de, date_iso, start_time, duration_minutes, address, instructor_name")
    .eq("id", toSessionId)
    .single();
  if (sErr || !toSession) {
    return NextResponse.json({ error: "Zieltermin nicht verfügbar." }, { status: 400 });
  }
  if (isCrossCourse && toSession.template_id !== targetTemplateId) {
    return NextResponse.json(
      { error: "Der gewählte Termin gehört nicht zum Zielkurs." },
      { status: 400 },
    );
  }

  const total = fee + surcharge;

  // The hold deadline is measured against the ORIGINAL course date.
  const { data: fromSession } = await admin
    .from("course_sessions")
    .select("date_iso")
    .eq("id", booking.session_id)
    .single();

  const expiresAt = holdExpiresAt(fromSession?.date_iso ?? null);

  // Persist the pending request first so its id can ride along in the Stripe
  // metadata; the webhook resolves the move from it after payment. The RPC also
  // takes the seats (old one freed, target one held) in the same transaction,
  // so a request can never exist without its hold.
  const { data: requestId, error: rErr } = await admin.rpc("create_course_rebooking_request", {
    p_booking_id: booking.id,
    p_to_session_id: toSessionId,
    p_fee_cents: fee,
    p_surcharge_cents: surcharge,
    p_to_template_id: targetTemplateId,
    p_to_course_type: targetCourseType,
    p_created_by: user.id,
    p_expires_at: expiresAt.toISOString(),
  });

  if (rErr || !requestId) {
    if (rErr?.message?.includes("REBOOKING_ALREADY_PENDING")) {
      return NextResponse.json(
        {
          error:
            "Für diese Buchung läuft bereits eine Umbuchung, die noch nicht bezahlt ist. Bitte ziehe sie zuerst zurück.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: rErr?.message || "Umbuchung konnte nicht angelegt werden." },
      { status: 500 },
    );
  }

  const request = { id: requestId as string };

  const currentCourseName =
    (booking.course_templates as { course_label_de?: string; title?: string } | null)
      ?.course_label_de ||
    (booking.course_templates as { title?: string } | null)?.title ||
    "EPHIA Kurs";
  const courseName = targetCourseName || currentCourseName;

  // Nothing to charge: apply the move immediately and confirm by email.
  if (total === 0) {
    const { error: applyErr } = await admin.rpc("apply_course_rebooking", {
      p_request_id: request.id,
    });
    if (applyErr) {
      return NextResponse.json(
        { error: applyErr.message || "Umbuchung konnte nicht angewendet werden." },
        { status: 500 },
      );
    }

    if (RESEND_API_KEY) {
      try {
        const startTime = toSession.start_time || "10:00";
        const [h, m] = startTime.split(":").map(Number);
        const totalMin = h * 60 + m + (toSession.duration_minutes || 360);
        const endTime = `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
        const html = buildSessionChangeEmail(booking.first_name || "Teilnehmer:in", courseName, {
          address: toSession.address || "",
          dateFormatted: toSession.date_iso ? formatDateDe(toSession.date_iso) : "",
          startTime,
          endTime,
          instructor: toSession.instructor_name || "",
        });
        const subject = isCrossCourse
          ? `Umbuchung bestätigt: ${courseName}`
          : `Terminänderung: ${courseName}`;
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
        console.error("Rebooking confirmation email failed (non-fatal):", emailErr);
      }
    }

    return NextResponse.json({ ok: true, applied: true });
  }

  // The Stripe Checkout session is created lazily when the doctor opens the
  // EPHIA payment page (/umbuchung/bezahlen/{requestId}). This avoids the 24h
  // Stripe session expiry: the emailed link points to our own page and never
  // expires (until the request is applied or cancelled).
  const paymentPageUrl = `${BOOKING_SITE_URL}/umbuchung/bezahlen/${request.id}`;

  // Email the payment page link to the doctor (best effort).
  if (RESEND_API_KEY) {
    try {
      // Same builder the 48h reminder uses, so the two mails can't drift apart.
      const html = buildRebookingPaymentEmail({
        firstName: booking.first_name || "Frau Kollegin, Herr Kollege",
        currentCourseName,
        targetCourseName: courseName,
        isCrossCourse,
        feeCents: fee,
        surchargeCents: surcharge,
        paymentUrl: paymentPageUrl,
        deadline: formatHoldDeadline(expiresAt.toISOString()),
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

  return NextResponse.json({ ok: true, paymentUrl: paymentPageUrl, requestId: request.id });
}
