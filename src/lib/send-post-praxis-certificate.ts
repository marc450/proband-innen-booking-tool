import type { SupabaseClient } from "@supabase/supabase-js";
import {
  certificateRequiresVnr,
  formatParticipantName,
  generateCertificatePdf,
  getCertificateForBooking,
  type CertificateTemplate,
} from "@/lib/certificates";
import {
  buildPostPraxisEmailHtml,
  buildPostPraxisEmailSubject,
} from "@/lib/post-praxis-email";
import { archiveSentMessage } from "@/lib/gmail";

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

// Hard cutoff: sessions whose praxis day is before this date never get
// a certificate, even if VNRs are filled in afterwards. Prevents the
// rollout from retroactively backfilling old courses that pre-date the
// feature. Bump this when you want to certify a specific older course.
const EARLIEST_CERT_SESSION_DATE = "2026-04-25";

interface SendResult {
  sent: number;
  skippedNoCert: number;
  skippedNoVnr: number;
  errors: number;
}

// Embedded-relation rows come back from Supabase as either the inferred
// object or an array of length 1 (depending on type-gen vs. runtime).
// Normalise to a single object.
function pickOne<T>(embedded: T | T[] | null | undefined): T | null {
  if (!embedded) return null;
  return Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;
}

interface EmbeddedTemplate {
  id: string | null;
  title: string | null;
  course_label_de: string | null;
  course_key: string | null;
  vnr_theorie: string | null;
}

interface SessionWithTemplate {
  id: string;
  template_id: string;
  date_iso: string;
  vnr_praxis: string | null;
  course_templates: EmbeddedTemplate | EmbeddedTemplate[] | null;
}

interface EmbeddedAuszubildende {
  title: string | null;
  specialty: string | null;
}

interface BookingRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  course_type: string;
  audience_tag: string | null;
  status: string | null;
  cert_sent_at: string | null;
  auszubildende_id: string | null;
  auszubildende: EmbeddedAuszubildende | EmbeddedAuszubildende[] | null;
}

export async function sendPostPraxisCertificates(
  supabase: SupabaseClient,
): Promise<SendResult> {
  const result: SendResult = { sent: 0, skippedNoCert: 0, skippedNoVnr: 0, errors: 0 };

  const today = new Date().toISOString().slice(0, 10);

  // Sessions whose praxis day has already passed (date_iso < today) but
  // not before the rollout cutoff. The lower bound stops us from
  // retroactively certifying courses that pre-date this feature.
  const { data: sessions, error: sessErr } = await supabase
    .from("course_sessions")
    .select(
      `id, template_id, date_iso, label_de, vnr_praxis,
       course_templates:template_id (
         id, title, course_label_de, course_key, vnr_theorie
       )`,
    )
    .gte("date_iso", EARLIEST_CERT_SESSION_DATE)
    .lt("date_iso", today);

  if (sessErr) {
    console.error("post-praxis cert scan: session query failed", sessErr);
    return result;
  }

  const sessionRows = (sessions ?? []) as unknown as SessionWithTemplate[];
  for (const session of sessionRows) {
    const template = pickOne(session.course_templates);
    if (!template) continue;

    const vnrTheorie = template.vnr_theorie?.trim() || "";
    const vnrPraxis = session.vnr_praxis?.trim() || "";

    // Bookings on this session that still need a cert. Join auszubildende
    // for the title (course_bookings.title is not stored — the Arzt:in's
    // title lives on the auszubildende row) and for the specialty so we
    // can route legacy Zahnmedizin bookings to the dentist cert.
    const { data: bookings, error: bookingErr } = await supabase
      .from("course_bookings")
      .select(
        `id, email, first_name, last_name, course_type, audience_tag, auszubildende_id,
         auszubildende:auszubildende_id ( title, specialty )`,
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

    const courseDay = formatDate(session.date_iso);

    const bookingRows = (bookings ?? []) as unknown as BookingRow[];
    for (const booking of bookingRows) {
      try {
        if (!booking.email) continue;
        const azubi = pickOne(booking.auszubildende);

        // Per-booking cert pick: dentists (audience_tag or specialty)
        // route to the Zahnmedizin cert; everyone else falls back to
        // the cert registered for the session's course_key.
        const cert = getCertificateForBooking({
          sessionCourseKey: template.course_key,
          audienceTag: booking.audience_tag,
          specialty: azubi?.specialty,
        });
        if (!cert) {
          result.skippedNoCert += 1;
          continue; // Silent skip — no cert for this booking.
        }

        // VNRs only matter for certs that actually stamp them. The
        // Zahnmedizin cert carries no CME and therefore no VNRs, so
        // skipping the check lets legacy dentist bookings receive a
        // cert even if vnr_theorie / vnr_praxis are empty.
        if (certificateRequiresVnr(cert) && (!vnrTheorie || !vnrPraxis)) {
          result.skippedNoVnr += 1;
          console.warn(
            `post-praxis cert: skipping booking ${booking.id} on session ${session.id} — VNR missing for ${cert.slug} (theorie=${!!vnrTheorie}, praxis=${!!vnrPraxis})`,
          );
          continue;
        }

        const fullName = formatParticipantName({
          title: azubi?.title,
          firstName: booking.first_name,
          lastName: booking.last_name,
        });
        if (!fullName) continue;

        const courseName =
          template.course_label_de || template.title || cert.label;

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

  // generateCertificatePdf gates VNR drawing on both the layout slot
  // and a non-empty value, so the dentist cert silently ignores the
  // empty strings we pass in here.
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

  // Mirror into the customerlove Gmail Sent folder so the cert email
  // shows up in the recipient's contact-profile email history. Best-
  // effort — a Gmail outage must not retro-fail the Resend send (which
  // would also undo the cert_sent_at write upstream).
  try {
    await archiveSentMessage({
      to,
      subject,
      html,
      attachments: [{ filename, content: base64, mimeType: "application/pdf" }],
    });
  } catch (err) {
    console.error("archiveSentMessage failed (non-fatal):", err);
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
