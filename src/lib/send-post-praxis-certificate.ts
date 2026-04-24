import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatParticipantName,
  generateCertificatePdf,
  getCertificateForCourseKey,
  type CertificateTemplate,
} from "@/lib/certificates";
import {
  buildPostPraxisEmailHtml,
  buildPostPraxisEmailSubject,
} from "@/lib/post-praxis-email";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;

/**
 * Scans course_sessions that happened at least 24h ago and sends the
 * post-praxis certificate email (with the rendered PDF attached) to each
 * non-cancelled booking that hasn't been sent to yet.
 *
 * Skip conditions (silent, no email sent):
 *  - The course template has no registered CertificateTemplate
 *    (getCertificateForCourseKey → undefined).
 *  - vnr_theorie on the template is empty.
 *  - vnr_praxis on the session is empty.
 *  - Booking course_type is Onlinekurs (no practical day, no cert).
 *  - Booking status = cancelled.
 *  - course_bookings.cert_sent_at is already set (already mailed).
 *
 * Uses a 1–30 day window so we catch anything the cron missed during
 * downtime without re-scanning the entire history every run.
 */

// Course types that include a practical day and therefore qualify for a
// certificate. Onlinekurs is excluded by design.
const CERTIFIABLE_COURSE_TYPES = ["Praxiskurs", "Kombikurs", "Premium"] as const;

interface SendResult {
  sent: number;
  skippedNoCert: number;
  skippedNoVnr: number;
  errors: number;
}

export async function sendPostPraxisCertificates(
  supabase: SupabaseClient,
): Promise<SendResult> {
  const result: SendResult = { sent: 0, skippedNoCert: 0, skippedNoVnr: 0, errors: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Pull sessions whose praxis day is 1–30 days in the past. The template
  // is joined so we can read vnr_theorie + course_key in one hop.
  const { data: sessions, error: sessErr } = await supabase
    .from("course_sessions")
    .select(
      `id, template_id, date_iso, label_de, vnr_praxis,
       course_templates:template_id (
         id, title, course_label_de, course_key, vnr_theorie
       )`,
    )
    .gte("date_iso", windowStart)
    .lt("date_iso", today);

  if (sessErr) {
    console.error("post-praxis cert scan: session query failed", sessErr);
    return result;
  }

  for (const session of sessions ?? []) {
    const template = (session as { course_templates: Record<string, unknown> | null })
      .course_templates;
    if (!template) continue;

    const courseKey = template.course_key as string | null;
    const cert = getCertificateForCourseKey(courseKey);
    if (!cert) {
      result.skippedNoCert += 1;
      continue; // Silent skip — course intentionally has no certificate.
    }

    const vnrTheorie = (template.vnr_theorie as string | null)?.trim() || "";
    const vnrPraxis = (session.vnr_praxis as string | null)?.trim() || "";
    if (!vnrTheorie || !vnrPraxis) {
      result.skippedNoVnr += 1;
      console.warn(
        `post-praxis cert: skipping session ${session.id} — VNR missing (theorie=${!!vnrTheorie}, praxis=${!!vnrPraxis})`,
      );
      continue;
    }

    // Bookings on this session that still need a cert. Join auszubildende
    // for the title (course_bookings.title is not stored — the Arzt:in's
    // title lives on the auszubildende row).
    const { data: bookings, error: bookingErr } = await supabase
      .from("course_bookings")
      .select(
        `id, email, first_name, last_name, course_type, auszubildende_id,
         auszubildende:auszubildende_id ( title )`,
      )
      .eq("session_id", session.id)
      .is("cert_sent_at", null)
      .neq("status", "cancelled")
      .in("course_type", [...CERTIFIABLE_COURSE_TYPES]);

    if (bookingErr) {
      console.error(
        `post-praxis cert: booking query failed for session ${session.id}`,
        bookingErr,
      );
      continue;
    }

    const courseName =
      (template.course_label_de as string | null) ||
      (template.title as string | null) ||
      cert.label;

    const courseDay = formatDate(session.date_iso);

    for (const booking of bookings ?? []) {
      try {
        if (!booking.email) continue;
        const azubi = (booking as { auszubildende: { title?: string | null } | null })
          .auszubildende;
        const fullName = formatParticipantName({
          title: azubi?.title,
          firstName: booking.first_name,
          lastName: booking.last_name,
        });
        if (!fullName) continue;

        await sendCertificateEmail({
          to: booking.email,
          firstName: booking.first_name || "Du",
          courseName,
          courseDay,
          cert,
          fullName,
          vnrTheorie,
          vnrPraxis,
        });

        await supabase
          .from("course_bookings")
          .update({ cert_sent_at: new Date().toISOString() })
          .eq("id", booking.id);

        result.sent += 1;
      } catch (err) {
        result.errors += 1;
        console.error(
          `post-praxis cert: send failed for booking ${booking.id}`,
          err,
        );
      }
    }
  }

  return result;
}

async function sendCertificateEmail(opts: {
  to: string;
  firstName: string;
  courseName: string;
  courseDay: string;
  cert: CertificateTemplate;
  fullName: string;
  vnrTheorie: string;
  vnrPraxis: string;
}) {
  const {
    to,
    firstName,
    courseName,
    courseDay,
    cert,
    fullName,
    vnrTheorie,
    vnrPraxis,
  } = opts;

  const pdfBytes = await generateCertificatePdf({
    template: cert,
    fullName,
    vnrTheorie,
    vnrPraxis,
  });

  const subject = buildPostPraxisEmailSubject({ courseName });
  const html = buildPostPraxisEmailHtml({ firstName, courseName, courseDay });
  const filename = `EPHIA-Zertifikat-${cert.label.replace(/\s+/g, "-")}.pdf`;
  const base64 = Buffer.from(pdfBytes).toString("base64");

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
      attachments: [{ filename, content: base64 }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend error: ${errText}`);
  }
}

function formatDate(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  if (!y || !m || !d) return dateIso;
  const MONTHS = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ];
  return `${String(d).padStart(2, "0")}. ${MONTHS[m - 1]} ${y}`;
}
