import type { SupabaseClient } from "@supabase/supabase-js";
import {
  certificateCanStampVnr,
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
 * booking that has been EXPLICITLY MARKED AS COMPLETED by staff and
 * hasn't been sent to yet.
 *
 * Skip conditions (silent, no email sent):
 *  - The course template has no registered CertificateTemplate
 *    (getCertificateForCourseKey → undefined).
 *  - The cert requires VNR (certificateRequiresVnr) but it isn't ready
 *    yet: vnr_theorie (template) or vnr_praxis (session) is empty, OR the
 *    cert can't stamp its VNR yet (master PDF still lacks the baked
 *    labels, so the layout has no vnr* slots). This is a HOLD, not a
 *    permanent skip: cert_sent_at stays null, so the booking is retried
 *    on every later cron run and the cert ships automatically once the
 *    VNRs are filled in and the cert gains its stamp slots. Used for CME
 *    courses whose VNR is assigned by the LÄK after the course was held
 *    (e.g. Grundkurs Dermalfiller).
 *  - Booking course_type is Onlinekurs (no practical day, no cert).
 *  - Booking status ≠ 'completed'. The default 'booked' state from
 *    Stripe checkout is NOT enough — staff must mark the booking as
 *    completed in /dashboard/auszubildende/buchungen for the cert
 *    cron to consider it. This is the compliance gate: a CME-bearing
 *    certificate (with VNR) is a Landesärztekammer-relevant document,
 *    so issuing one to a no-show is a regulatory liability. Marc made
 *    this explicit on 2026-05-10 after auditing the previous
 *    "everything except cancelled" filter.
 *  - course_bookings.cert_sent_at is already set (already mailed).
 *
 * Uses a 1–30 day window so we catch anything the cron missed during
 * downtime, AND so that bookings staff marks completed several days
 * after the course day still get their cert on the next cron run.
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
  // Canonical name from the profile. Preferred over the
  // course_bookings.first_name/last_name snapshot which was captured at
  // Stripe checkout and never gets updated when an Arzt:in corrects
  // their profile (e.g. fixed last name). Certs must always print the
  // current profile name so they match what the recipient sees.
  first_name: string | null;
  last_name: string | null;
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
    // title lives on the auszubildende row), the specialty (routes legacy
    // Zahnmedizin bookings to the dentist cert), and the canonical
    // first/last name. The course_bookings name columns are a stale
    // Stripe-checkout snapshot; if the profile has a name we prefer that
    // so the cert PDF matches what the recipient sees on her profile.
    const { data: bookings, error: bookingErr } = await supabase
      .from("course_bookings")
      .select(
        `id, email, first_name, last_name, course_type, audience_tag, auszubildende_id,
         auszubildende:auszubildende_id ( title, specialty, first_name, last_name )`,
      )
      .eq("session_id", session.id)
      .is("cert_sent_at", null)
      // Strict gate: only completed bookings ship a certificate.
      // Default 'booked' (post-Stripe checkout) and 'cancelled' /
      // 'refunded' are all excluded. Staff flips the status manually
      // in /dashboard/auszubildende/buchungen after the course day.
      // See file header for the why.
      .eq("status", "completed")
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

        // VNRs only matter for certs that actually carry CME. The
        // Zahnmedizin cert carries no CME and therefore no VNRs, so
        // skipping the check lets legacy dentist bookings receive a
        // cert even if vnr_theorie / vnr_praxis are empty.
        //
        // For a CME cert we hold the booking back (no email, retried on
        // the next run) until BOTH the DB VNR values are present AND the
        // cert can stamp them. The canStamp guard covers the window where
        // a CME course (e.g. Dermalfiller) is flagged requiresVnr but its
        // master PDF still lacks the baked VNR labels, so issuing a cert
        // would silently drop the VNR — a Landesärztekammer-relevant
        // document must never go out without its VNR printed.
        if (certificateRequiresVnr(cert)) {
          const ready =
            !!vnrTheorie && !!vnrPraxis && certificateCanStampVnr(cert);
          if (!ready) {
            result.skippedNoVnr += 1;
            console.warn(
              `post-praxis cert: holding booking ${booking.id} on session ${session.id} — VNR not ready for ${cert.slug} (theorie=${!!vnrTheorie}, praxis=${!!vnrPraxis}, canStamp=${certificateCanStampVnr(cert)})`,
            );
            continue;
          }
        }

        // Prefer the canonical name from the auszubildende profile over
        // the Stripe-checkout snapshot on course_bookings. Falls back to
        // the snapshot only if the profile name is empty (rare; pre-link
        // legacy bookings).
        const firstName =
          (azubi?.first_name || "").trim() || booking.first_name;
        const lastName =
          (azubi?.last_name || "").trim() || booking.last_name;

        const fullName = formatParticipantName({
          title: azubi?.title,
          firstName,
          lastName,
        });
        if (!fullName) continue;

        const courseName =
          template.course_label_de || template.title || cert.label;

        await sendCertificateEmail({
          to: booking.email,
          firstName: firstName || "Du",
          courseName,
          courseDay,
          cert,
          fullName,
          vnrTheorie,
          vnrPraxis,
          sessionDateIso: session.date_iso,
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
  /** date_iso of the Praxiskurs session. Drives the dynamic
   *  "Berlin, <Monat> <Jahr>" stamp in the footer. */
  sessionDateIso: string;
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
    sessionDateIso,
  } = opts;

  // generateCertificatePdf gates VNR drawing on both the layout slot
  // and a non-empty value, so the dentist cert silently ignores the
  // empty strings we pass in here. Same gating applies to the date
  // stamp: certs without a dateStamp layout (Zahnmedizin) ignore the
  // session date and leave the master PDF untouched.
  const pdfBytes = await generateCertificatePdf({
    template: cert,
    fullName,
    vnrTheorie,
    vnrPraxis,
    sessionDateIso,
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
