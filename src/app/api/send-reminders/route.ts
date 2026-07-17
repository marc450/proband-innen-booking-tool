import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptPatient } from "@/lib/encryption";
import { buildEmailHtml } from "@/lib/email-template";
import { sendProfileReminderEmail } from "@/lib/post-purchase";
import { sendPostPraxisCertificates } from "@/lib/send-post-praxis-certificate";
import { sendPraxisOnlineReminders } from "@/lib/send-praxis-online-reminder";
import { scheduleCourseReviewEmails } from "@/lib/send-course-review-request";
import { sendPostTreatmentProbandReviews } from "@/lib/send-proband-review-request";
import { sweepStaleReviewEmails } from "@/lib/cancel-scheduled-review-email";
import { runGaldermaExport } from "@/lib/run-galderma-export";
import { runGaldermaContactIntros } from "@/lib/run-galderma-contact-intros";
import { runRebookingExpiry } from "@/lib/run-rebooking-expiry";
import { runRebookingReminders } from "@/lib/run-rebooking-reminders";
import { runPaymentReconciliation } from "@/lib/run-payment-reconciliation";
import { archiveSentMessage } from "@/lib/gmail";
import { INDICATIONS } from "@/lib/indications";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const CRON_SECRET = process.env.CRON_SECRET;

// GET /api/send-reminders
// Sends 72h and 24h reminder emails for upcoming Proband:innen bookings.
// Protected by CRON_SECRET header to prevent unauthorized access.
export async function GET(req: NextRequest) {
  // Fail CLOSED: require the CRON_SECRET bearer. If the secret is unset we
  // reject rather than skip the check, so a missing/typo'd env var can't
  // turn this into a public endpoint. This route triggers mass reminder
  // emails and the Galderma PII export, so an open door here is serious.
  const authHeader = req.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const results = {
    reminders72h: 0,
    reminders24h: 0,
    profileReminders: 0,
    certificates: 0,
    certSkippedNoCert: 0,
    certSkippedNoVnr: 0,
    reviewEmailsScheduled: 0,
    reviewEmailsSkipped: 0,
    probandReviewEmailsSent: 0,
    staleReviewEmailsFound: 0,
    staleReviewEmailsCancelled: 0,
    galdermaExported: 0,
    galdermaContactIntros: 0,
    paymentProblems: 0,
    rebookingReminders: 0,
    rebookingHoldsExpired: 0,
    praxisOnlineReminders: 0,
    errors: 0,
  };

  try {
    // ── Galderma partner data export (day after the course) ──
    // Same nightly cadence and idempotency model as the certificate pass:
    // scans already-passed Praxis/Kombi sessions and sends each consenting
    // participant to Galderma exactly once (stamped via exported_at).
    // No-ops entirely while GALDERMA_EXPORT_LIVE is off.
    try {
      const galderma = await runGaldermaExport(supabase);
      results.galdermaExported = galderma.exported;
      results.errors += galderma.errors;
    } catch (galdermaErr) {
      console.error("Galderma export pass failed:", galdermaErr);
      results.errors += 1;
    }

    // ── Zahlungsabgleich (Stripe vs. DB) ──
    // Catches the paths that take money and then silently do nothing: a paid
    // session with no booking, a half-created curriculum bundle, an
    // Umbuchungsgebühr that never got applied. These customers paid and are
    // waiting; they mostly don't complain, they just give up.
    try {
      const reconciliation = await runPaymentReconciliation(supabase);
      results.paymentProblems = reconciliation.newAlerts;
      results.errors += reconciliation.errors;
    } catch (reconcileErr) {
      console.error("Payment reconciliation pass failed:", reconcileErr);
      results.errors += 1;
    }

    // ── Zahlungserinnerung für offene Umbuchungen (nach 48h) ──
    // Runs BEFORE the reaper below so a hold that lapses today still gets its
    // reminder attempt first; the pass skips anything already expired anyway.
    try {
      const reminders = await runRebookingReminders(supabase);
      results.rebookingReminders = reminders.sent;
      results.errors += reminders.errors;
    } catch (reminderErr) {
      console.error("Rebooking reminder pass failed:", reminderErr);
      results.errors += 1;
    }

    // ── Umbuchungen ohne Zahlungseingang freigeben ──
    // A pending Umbuchung holds two seats: the doctor's original seat is
    // already resellable and a seat in the target session is reserved for her.
    // Once the deadline passes unpaid, hand the target seat back and restore
    // her on her original date, where she stays booked until she pays.
    try {
      const rebookings = await runRebookingExpiry(supabase);
      results.rebookingHoldsExpired = rebookings.expired;
      results.errors += rebookings.errors;
    } catch (rebookingErr) {
      console.error("Rebooking expiry pass failed:", rebookingErr);
      results.errors += 1;
    }

    // ── Galderma contact intro (24h after the doctor signs the consent) ──
    // Emails each consenting Ärzt:in their personal Galderma contact (the
    // überregionale Ansprechpartnerin) exactly once, 24h after signing
    // (stamped via contact_intro_sent_at). Goes to the doctor, not Galderma.
    // No-ops entirely while GALDERMA_EXPORT_LIVE is off.
    try {
      const contactIntros = await runGaldermaContactIntros(supabase);
      results.galdermaContactIntros = contactIntros.sent;
      results.errors += contactIntros.errors;
    } catch (contactErr) {
      console.error("Galderma contact-intro pass failed:", contactErr);
      results.errors += 1;
    }

    // ── Onlinekurs-Prerequisite reminder (up to 7 days before praxis) ──
    // Reminds Praxis/Kombi/Premium participants whose LearnWorlds online
    // progress is still below the required 90% mark that they must finish
    // the online course to attend. Shows their current completion; sent
    // once per booking, locked via course_bookings.praxis_reminder_sent_at.
    try {
      const praxisReminder = await sendPraxisOnlineReminders(supabase);
      results.praxisOnlineReminders = praxisReminder.sent;
      results.errors += praxisReminder.errors;
    } catch (praxisErr) {
      console.error("Praxis online-reminder pass failed:", praxisErr);
      results.errors += 1;
    }

    // ── Post-praxis certificates (24h after the praxis day) ──
    // Scans course_sessions whose praxis day has already passed and
    // emails the certificate PDF to each participant that hasn't been
    // sent to yet. Fully idempotent via course_bookings.cert_sent_at.
    try {
      const certResult = await sendPostPraxisCertificates(supabase);
      results.certificates = certResult.sent;
      results.certSkippedNoCert = certResult.skippedNoCert;
      results.certSkippedNoVnr = certResult.skippedNoVnr;
      results.errors += certResult.errors;
    } catch (certErr) {
      console.error("Post-praxis certificate pass failed:", certErr);
      results.errors += 1;
    }

    // ── Course review request scheduling (Resend scheduled_at) ──
    // Scans course_bookings whose course end falls within Resend's
    // scheduling horizon and queues the review email to fire at the exact
    // session end. Daily run keeps the rolling window populated; minute-
    // level precision is Resend's job, not ours.
    try {
      const reviewResult = await scheduleCourseReviewEmails(supabase);
      results.reviewEmailsScheduled = reviewResult.scheduled;
      results.reviewEmailsSkipped = reviewResult.skipped;
      results.errors += reviewResult.errors;
    } catch (reviewErr) {
      console.error("Course review scheduling pass failed:", reviewErr);
      results.errors += 1;
    }

    // ── Post-treatment Proband:innen review requests ──
    // Asks each proband who attended a treatment in the last few days (but
    // at least 24h ago, so no-shows have already been marked) for a review,
    // exactly once. No-show / cancelled bookings are excluded upstream;
    // patients.review_request_resent_at is the shared one-email-per-proband
    // lock with the manual "Vergangene anschreiben" pass.
    try {
      const probandReview = await sendPostTreatmentProbandReviews(supabase);
      results.probandReviewEmailsSent = probandReview.scheduled;
      results.errors += probandReview.errors;
    } catch (probandErr) {
      console.error("Post-treatment proband review pass failed:", probandErr);
      results.errors += 1;
    }

    // ── Stale review-email sweep ──
    // Catches drift when a booking has been moved out of the active set
    // (cancelled/refunded) but still carries a future-dated Resend
    // scheduled review email. Cleanup hooks in the dashboard fire-and-
    // forget the cancel call, and direct DB edits skip them entirely;
    // this nightly sweep is the safety net that prevents a stale review
    // email from going out to someone who's no longer attending.
    try {
      const sweep = await sweepStaleReviewEmails(supabase);
      results.staleReviewEmailsFound = sweep.found;
      results.staleReviewEmailsCancelled = sweep.cancelled;
      results.errors += sweep.failed;
    } catch (sweepErr) {
      console.error("Stale review-email sweep failed:", sweepErr);
      results.errors += 1;
    }

    // ── Profile completion reminders for Auszubildende ──
    // Send reminder to users who haven't completed their profile 30+ minutes
    // after booking. Legacy imports are explicitly excluded: their
    // profile_complete = false because they were carried over from the
    // pre-launch ops setup, not because they just booked through Stripe.
    // The reminder copy ("damit wir Deinen Kurs freischalten können") is
    // wrong for them — they already have course access.
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const { data: incompleteBookings } = await supabase
      .from("course_bookings")
      .select("id, email, first_name")
      .eq("profile_complete", false)
      .eq("profile_reminder_sent", false)
      .eq("legacy_import", false)
      .lt("created_at", thirtyMinAgo);

    if (incompleteBookings && incompleteBookings.length > 0) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proband-innen.ephia.de";
      for (const b of incompleteBookings) {
        try {
          await sendProfileReminderEmail(b.email, b.first_name || "Du", b.id, baseUrl);
          await supabase
            .from("course_bookings")
            .update({ profile_reminder_sent: true })
            .eq("id", b.id);
          results.profileReminders++;
        } catch (err) {
          console.error(`Profile reminder error for booking ${b.id}:`, err);
          results.errors++;
        }
      }
    }

    // Fetch all booked (active) bookings with their slot + course info
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        id, patient_id, status, reminder_72h_sent, reminder_24h_sent, indication,
        slots (
          id, start_time, end_time,
          courses (
            title, treatment_title, course_date, location
          )
        )
      `)
      .eq("status", "booked");

    if (error) {
      console.error("Error fetching bookings:", error);
      return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ message: "No active bookings", ...results });
    }

    for (const booking of bookings) {
      try {
        const slot = booking.slots as any;
        if (!slot?.start_time) continue;

        const slotTime = new Date(slot.start_time);
        // Calendar-day distance in Europe/Berlin. Raw hoursUntil math
        // would let the "morgen" reminder fire for a same-day appointment
        // (e.g. cron at 10:03, slot at 14:00 → 4h → previously matched
        // the 24h window), and the "in 3 Tagen" reminder fire when the
        // slot is only 2 days away.
        const daysUntil = calendarDaysUntilBerlin(slotTime, now);
        const needs72h = !booking.reminder_72h_sent && daysUntil === 3;
        const needs24h = !booking.reminder_24h_sent && daysUntil === 1;

        if (!needs72h && !needs24h) continue;

        // Fetch and decrypt patient data
        const { data: patientRow } = await supabase
          .from("patients")
          .select("*")
          .eq("id", booking.patient_id)
          .single();

        if (!patientRow) continue;

        const patient = decryptPatient(patientRow);
        if (!patient.email) continue;

        const firstName = patient.first_name || "Du";
        const course = slot.courses as any;
        const indicationLabel = (booking as any).indication
          ? INDICATIONS.find((i) => i.key === (booking as any).indication)?.label ?? null
          : null;
        const treatmentTitle = indicationLabel || course?.treatment_title || course?.title || "Dein Termin";
        const courseLocation = course?.location || "";

        // Format date and time
        let formattedDate = "";
        let formattedTime = "";
        try {
          formattedDate = slotTime.toLocaleDateString("de-DE", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
            timeZone: "Europe/Berlin",
          });
          formattedTime = slotTime.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Berlin",
          }) + " Uhr";
        } catch {
          formattedDate = slot.start_time;
        }

        // Send 72h reminder
        if (needs72h) {
          const html = buildEmailHtml({
            firstName,
            intro: "in 3 Tagen ist es soweit: Dein Termin bei EPHIA steht an. Bitte sei 10 Minuten vor Deinem Termin da.",
            infoRows: [
              { label: "Behandlung", value: treatmentTitle },
              { label: "Datum", value: formattedDate },
              { label: "Uhrzeit", value: formattedTime },
              ...(courseLocation ? [{ label: "Ort", value: courseLocation }] : []),
            ],
            note: "Falls Du nicht kommen kannst, sage bitte rechtzeitig ab, damit wir den Platz weitergeben können. Bei Nichterscheinen oder Absage weniger als 48 Stunden vor dem Termin wird eine Ausfallgebühr von 50,00 EUR erhoben.",
            closing: "Wir freuen uns auf Dich!<br><br>Liebe Grüße,<br>Dein EPHIA-Team",
          });

          await sendEmail(patient.email, "Dein Termin bei EPHIA in 3 Tagen", html);
          await supabase
            .from("bookings")
            .update({ reminder_72h_sent: true })
            .eq("id", booking.id);
          results.reminders72h++;
        }

        // Send 24h reminder
        if (needs24h) {
          const html = buildEmailHtml({
            firstName,
            intro: "eine kurze Erinnerung: Dein Termin ist morgen. Bitte sei 10 Minuten vor Deinem Termin da.",
            infoRows: [
              { label: "Behandlung", value: treatmentTitle },
              { label: "Datum", value: formattedDate },
              { label: "Uhrzeit", value: formattedTime },
              ...(courseLocation ? [{ label: "Ort", value: courseLocation }] : []),
            ],
            closing: "Bis morgen!<br><br>Liebe Grüße,<br>Dein EPHIA-Team",
          });

          await sendEmail(patient.email, "Dein Termin bei EPHIA ist morgen", html);
          await supabase
            .from("bookings")
            .update({ reminder_24h_sent: true })
            .eq("id", booking.id);
          results.reminders24h++;
        }
      } catch (bookingErr) {
        console.error(`Error processing booking ${booking.id}:`, bookingErr);
        results.errors++;
      }
    }

    console.log("Reminder results:", results);
    return NextResponse.json({ message: "Reminders sent", ...results });
  } catch (err) {
    console.error("Send reminders error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Calendar-day distance in Europe/Berlin between `now` and `target`.
// Returns 1 if the target is "tomorrow" in Berlin, regardless of clock time.
function calendarDaysUntilBerlin(target: Date, now: Date): number {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [tY, tM, tD] = fmt.format(target).split("-").map(Number);
  const [nY, nM, nD] = fmt.format(now).split("-").map(Number);
  const targetUTC = Date.UTC(tY, tM - 1, tD);
  const nowUTC = Date.UTC(nY, nM - 1, nD);
  return Math.round((targetUTC - nowUTC) / (1000 * 60 * 60 * 24));
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "EPHIA <customerlove@ephia.de>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend error: ${errText}`);
  }

  // Mirror into Gmail Sent so the patient profile picks up the
  // reminder. Best-effort: a Gmail outage must not fail the cron job.
  try {
    await archiveSentMessage({ to, subject, html });
  } catch (archiveErr) {
    console.error("archiveSentMessage failed (non-fatal):", archiveErr);
  }
}
