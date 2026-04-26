import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptPatient } from "@/lib/encryption";
import { buildEmailHtml } from "@/lib/email-template";
import { sendProfileReminderEmail } from "@/lib/post-purchase";
import { sendPostPraxisCertificates } from "@/lib/send-post-praxis-certificate";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const CRON_SECRET = process.env.CRON_SECRET;

// GET /api/send-reminders
// Sends 72h and 24h reminder emails for upcoming Proband:innen bookings.
// Protected by CRON_SECRET header to prevent unauthorized access.
export async function GET(req: NextRequest) {
  // Auth check: require secret header (skip if CRON_SECRET not set, for dev)
  if (CRON_SECRET) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
    errors: 0,
  };

  try {
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

    // ── Profile completion reminders for Auszubildende ──
    // Send reminder to users who haven't completed their profile 30+ minutes after booking.
    // Legacy imports are explicitly excluded: their profile_complete = false
    // because they were carried over from the pre-launch ops setup, not
    // because they just booked through Stripe and forgot to fill in the form.
    // The reminder copy ("damit wir Deinen Kurs freischalten können") is
    // wrong for them — they already have course access. The 2026-04-26
    // legacy-apology batch handled the historical 64 affected; this filter
    // makes sure no future cron run repeats the mistake.
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
        id, patient_id, status, reminder_72h_sent, reminder_24h_sent,
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
        const hoursUntil = (slotTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Determine which reminder(s) to send
        const needs72h = !booking.reminder_72h_sent && hoursUntil <= 72 && hoursUntil > 24;
        const needs24h = !booking.reminder_24h_sent && hoursUntil <= 24 && hoursUntil > 0;

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
        const treatmentTitle = course?.treatment_title || course?.title || "Dein Termin";
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
}
