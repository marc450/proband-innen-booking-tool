import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEmailHtml } from "@/lib/email-template";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://proband-innen.ephia.de";

// Resend's scheduled_at horizon: ~30 days. Use a slightly tighter
// window so we never bump up against the limit and get a 422 back.
const SCHEDULE_WINDOW_DAYS = 25;

const REVIEW_EMAIL_FROM = "EPHIA <customerlove@ephia.de>";

interface SessionRow {
  id: string;
  date_iso: string;
  start_time: string | null;
  duration_minutes: number | null;
}

interface BookingRow {
  id: string;
  email: string | null;
  first_name: string | null;
  template_id: string;
  legacy_import: boolean | null;
  status: string;
  course_sessions: SessionRow | SessionRow[] | null;
  course_templates:
    | { title: string | null; course_label_de: string | null }
    | { title: string | null; course_label_de: string | null }[]
    | null;
}

interface ScheduleResult {
  scheduled: number;
  skipped: number;
  errors: number;
}

// Compute the wall-clock end of a course session.
// `date_iso` is yyyy-MM-dd in Europe/Berlin local terms; `start_time` is
// "HH:mm" or "HH:mm:ss". We treat the session as Europe/Berlin and convert
// to a UTC Date by appending the current Berlin offset (handled by the
// browser-style ISO string + timezone interpretation in Node).
//
// Pragmatic approach: build the local Date string and let Date parse it as
// local-time-of-the-server. Railway runs UTC; the Berlin offset is +1 or
// +2. We handle that by using formatToParts/Intl. Returns null if any
// component is missing or unparseable.
function computeSessionEnd(session: SessionRow): Date | null {
  if (!session.date_iso || !session.start_time) return null;
  const duration = session.duration_minutes ?? 0;
  if (duration <= 0) return null;

  // Normalize start_time to HH:mm
  const time = session.start_time.slice(0, 5);
  // Build an ISO-like local timestamp and interpret it via Intl in Berlin.
  // We do this by:
  //   1. Constructing a UTC Date for date_iso + time
  //   2. Asking Intl what the Berlin offset is at that moment
  //   3. Subtracting the offset to get the actual UTC instant of the
  //      Berlin local time
  // This handles DST correctly for the weekend course in any month.
  const naive = new Date(`${session.date_iso}T${time}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    timeZoneName: "shortOffset",
  });
  const parts = fmt.formatToParts(naive);
  const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value || "GMT+1";
  // offsetPart looks like "GMT+2" or "GMT+1"
  const offsetHours = Number(offsetPart.replace("GMT", "")) || 0;

  const startUtc = new Date(naive.getTime() - offsetHours * 60 * 60 * 1000);
  const endUtc = new Date(startUtc.getTime() + duration * 60 * 1000);
  return endUtc;
}

function buildToken(): string {
  // 32 bytes base64url = 43 chars, plenty of entropy for a single-use link
  return randomBytes(32).toString("base64url");
}

function buildReviewEmailHtml(opts: {
  firstName: string;
  reviewUrl: string;
}): string {
  return buildEmailHtml({
    firstName: opts.firstName,
    intro:
      "vielen Dank, dass Du heute bei uns warst. Solange Dein Eindruck noch frisch ist, ist Dein Feedback für uns am wertvollsten. Bitte nimm Dir 1 Minute, bevor Du Dich auf den Heimweg machst.",
    note:
      "Deine Sterne und Dein kurzer Bewertungstext erscheinen später mit Deinem Vornamen auf unserer Kursseite. Das zusätzliche Team-Feedback bleibt anonym und erreicht nur uns intern.",
    buttons: [
      {
        label: "Bewertung abgeben",
        url: opts.reviewUrl,
      },
    ],
    closing:
      "Wir lesen jede einzelne Antwort.<br><br>Herzliche Grüße,<br>Dein EPHIA-Team",
  });
}

function buildReviewSubject(courseTitle: string): string {
  return `Wie war Dein ${courseTitle}?`;
}

interface ScheduleResendResponse {
  id?: string;
}

async function scheduleViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  scheduledAtIso: string;
}): Promise<string> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: REVIEW_EMAIL_FROM,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      scheduled_at: opts.scheduledAtIso,
      tags: [{ name: "ephia-purpose", value: "course-review-request" }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend schedule failed (${res.status}): ${errText}`);
  }
  const json = (await res.json()) as ScheduleResendResponse;
  if (!json.id) throw new Error("Resend response missing email id");
  return json.id;
}

// Daily-cron pass. Picks up bookings whose course end time falls in the
// next SCHEDULE_WINDOW_DAYS, has not been scheduled yet, and belongs to a
// non-cancelled live booking. For each: mint a token, schedule the email
// via Resend at the exact end time, persist the resend_id + token. Resend
// then fires the email within seconds of course end, regardless of when
// the daily cron itself runs.
//
// Idempotent: bookings already carrying a review_email_resend_id are
// filtered out, so re-runs only schedule freshly-eligible ones.
export async function scheduleCourseReviewEmails(
  supabase: SupabaseClient,
  opts: { onlySessionId?: string } = {},
): Promise<ScheduleResult> {
  const result: ScheduleResult = { scheduled: 0, skipped: 0, errors: 0 };
  const nowMs = Date.now();
  const horizonMs = nowMs + SCHEDULE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  let query = supabase
    .from("course_bookings")
    .select(
      `id, email, first_name, template_id, legacy_import, status,
       course_sessions ( id, date_iso, start_time, duration_minutes ),
       course_templates:template_id ( title, course_label_de )`,
    )
    .is("review_email_resend_id", null)
    .is("review_email_sent_at", null)
    .in("status", ["booked", "completed"])
    .eq("legacy_import", false)
    .not("email", "is", null)
    .not("session_id", "is", null);

  if (opts.onlySessionId) {
    query = query.eq("session_id", opts.onlySessionId);
  }

  const { data: bookings, error } = await query.returns<BookingRow[]>();
  if (error) {
    console.error("schedule-review-emails: query failed", error);
    return { ...result, errors: 1 };
  }
  if (!bookings || bookings.length === 0) return result;

  for (const booking of bookings) {
    try {
      const session = Array.isArray(booking.course_sessions)
        ? booking.course_sessions[0]
        : booking.course_sessions;
      if (!session) {
        result.skipped++;
        continue;
      }
      const endAt = computeSessionEnd(session);
      if (!endAt) {
        result.skipped++;
        continue;
      }
      // In the future and within Resend's horizon? Skip otherwise (past
      // courses can't have their post-course email scheduled retroactively
      // via scheduled_at; far-future courses must wait for a later pass).
      const endMs = endAt.getTime();
      if (endMs <= nowMs || endMs > horizonMs) {
        result.skipped++;
        continue;
      }
      if (!booking.email) {
        result.skipped++;
        continue;
      }

      const tpl = Array.isArray(booking.course_templates)
        ? booking.course_templates[0]
        : booking.course_templates;
      const courseTitle =
        tpl?.course_label_de || tpl?.title || "Deinem EPHIA-Kurs";
      const firstName = booking.first_name?.trim() || "Du";

      const token = buildToken();
      const reviewUrl = `${APP_URL}/bewertung/${token}`;
      const subject = buildReviewSubject(courseTitle);
      const html = buildReviewEmailHtml({ firstName, reviewUrl });

      // Persist the token FIRST so a successful Resend call always has a
      // matching DB row to validate against. If the persist fails we
      // skip the send — better to leave the booking unscheduled than to
      // send a token we can't honor.
      const { error: tokenErr } = await supabase
        .from("course_bookings")
        .update({ review_submit_token: token })
        .eq("id", booking.id)
        .is("review_submit_token", null);
      if (tokenErr) {
        console.error(
          `schedule-review-emails: token persist failed for booking ${booking.id}`,
          tokenErr,
        );
        result.errors++;
        continue;
      }

      const resendId = await scheduleViaResend({
        to: booking.email,
        subject,
        html,
        scheduledAtIso: endAt.toISOString(),
      });

      const { error: markErr } = await supabase
        .from("course_bookings")
        .update({
          review_email_resend_id: resendId,
          review_email_sent_at: endAt.toISOString(),
        })
        .eq("id", booking.id);
      if (markErr) {
        console.error(
          `schedule-review-emails: mark failed for booking ${booking.id}`,
          markErr,
        );
        result.errors++;
        continue;
      }

      // We deliberately do NOT mirror into Gmail Sent here. Resend will
      // fire this email at the future scheduled time, not now, so an
      // archive at scheduling time would falsely date the entry. The
      // resend-webhook route already has the archive-on-actual-delivery
      // path for tagged sends; extending it to the
      // "ephia-purpose=course-review-request" tag is a follow-up.
      result.scheduled++;
    } catch (err) {
      console.error(
        `schedule-review-emails: unexpected error for booking ${booking.id}`,
        err,
      );
      result.errors++;
    }
  }

  return result;
}
