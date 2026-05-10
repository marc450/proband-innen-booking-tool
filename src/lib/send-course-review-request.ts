import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEmailHtml } from "@/lib/email-template";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
// Doctor-facing URL: the review form lives on ephia.de. Old links
// already queued in Resend (or sitting in inboxes) at the
// proband-innen subdomain keep working via a 308 in middleware.ts.
const APP_URL = "https://ephia.de";

// Resend's scheduled_at horizon: ~30 days. Use a slightly tighter
// window so we never bump up against the limit and get a 422 back.
const SCHEDULE_WINDOW_DAYS = 25;

// Fire the review email 1h before course end. Doctors react to it
// while still in the room (or right as they pack up), instead of
// after they've already left and forgotten about it.
const FIRE_BEFORE_END_MINUTES = 60;

// Resend's default API rate limit is 2 requests/sec. Wait 600ms
// between schedule calls so a batch reschedule of 40+ bookings
// doesn't get half its sends 429'd.
const RESEND_RATE_LIMIT_DELAY_MS = 600;

const REVIEW_EMAIL_FROM = "EPHIA <customerlove@ephia.de>";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

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
  /** Up to first 3 error messages, surfaced for UI debugging. */
  errorSamples: string[];
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
      "vielen Dank, dass Du heute bei uns bist. Solange Dein Eindruck noch frisch ist, ist Dein Feedback für uns am wertvollsten. Bitte nimm Dir 1 Minute, bevor Du gehst.",
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
// via Resend FIRE_BEFORE_END_MINUTES before course end, persist the
// resend_id + token. Resend then fires the email at that scheduled time,
// regardless of when the daily cron itself runs.
//
// Idempotent: bookings already carrying a review_email_resend_id are
// filtered out, so re-runs only schedule freshly-eligible ones.
export async function scheduleCourseReviewEmails(
  supabase: SupabaseClient,
  opts: { onlySessionId?: string } = {},
): Promise<ScheduleResult> {
  const result: ScheduleResult = {
    scheduled: 0,
    skipped: 0,
    errors: 0,
    errorSamples: [],
  };
  const captureError = (msg: string) => {
    if (result.errorSamples.length < 3) result.errorSamples.push(msg);
  };
  const nowMs = Date.now();
  const horizonMs = nowMs + SCHEDULE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  // We deliberately do NOT filter on legacy_import. Post-course
  // communication (certificate, review request) goes to every attendee
  // regardless of how the booking row was created. The legacy_import
  // exclusion only makes sense for pre-course onboarding emails like
  // profile-completion reminders, which assume the doctor went through
  // the live signup funnel.
  let query = supabase
    .from("course_bookings")
    .select(
      `id, email, first_name, template_id, status,
       course_sessions ( id, date_iso, start_time, duration_minutes ),
       course_templates:template_id ( title, course_label_de )`,
    )
    .is("review_email_resend_id", null)
    .is("review_email_sent_at", null)
    .in("status", ["booked", "completed"])
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
      // Fire 1h before course end so doctors react while still in the
      // room. Past sessions (sendAt already in the past) can't be
      // scheduled via Resend's scheduled_at; far-future ones must wait
      // for a later pass.
      const sendAt = new Date(
        endAt.getTime() - FIRE_BEFORE_END_MINUTES * 60 * 1000,
      );
      const sendAtMs = sendAt.getTime();
      if (sendAtMs <= nowMs || sendAtMs > horizonMs) {
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

      // Persist the token FIRST so a successful Resend call always has
      // a matching DB row to validate against. Unconditional update
      // (not gated on `review_submit_token IS NULL`): if a previous
      // attempt left a stale token from a failed Resend call, we
      // overwrite it here with the fresh token, keeping the in-memory
      // value and the DB row in sync. The SQL filter on
      // `review_email_resend_id IS NULL` already prevents us from
      // touching bookings whose email has actually been scheduled.
      const { error: tokenErr } = await supabase
        .from("course_bookings")
        .update({ review_submit_token: token })
        .eq("id", booking.id);
      if (tokenErr) {
        console.error(
          `schedule-review-emails: token persist failed for booking ${booking.id}`,
          tokenErr,
        );
        captureError(`Token persist: ${tokenErr.message}`);
        result.errors++;
        continue;
      }

      let resendId: string;
      try {
        resendId = await scheduleViaResend({
          to: booking.email,
          subject,
          html,
          scheduledAtIso: sendAt.toISOString(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `schedule-review-emails: Resend schedule failed for booking ${booking.id}`,
          msg,
        );
        captureError(`Resend: ${msg}`);
        result.errors++;
        // Stay below Resend's 2 req/sec rate limit. We delay even on
        // failure because 429s contribute to the throttling window.
        await sleep(RESEND_RATE_LIMIT_DELAY_MS);
        continue;
      }

      const { error: markErr } = await supabase
        .from("course_bookings")
        .update({
          review_email_resend_id: resendId,
          review_email_sent_at: sendAt.toISOString(),
        })
        .eq("id", booking.id);
      if (markErr) {
        console.error(
          `schedule-review-emails: mark failed for booking ${booking.id}`,
          markErr,
        );
        captureError(`DB mark: ${markErr.message}`);
        result.errors++;
        await sleep(RESEND_RATE_LIMIT_DELAY_MS);
        continue;
      }

      // We deliberately do NOT mirror into Gmail Sent here. Resend will
      // fire this email at the future scheduled time, not now, so an
      // archive at scheduling time would falsely date the entry. The
      // resend-webhook route handles the archive on actual delivery
      // and gates on the "ephia-purpose=course-review-request" tag.
      result.scheduled++;
      // Pace successive sends so we stay under Resend's 2 req/sec.
      await sleep(RESEND_RATE_LIMIT_DELAY_MS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      captureError(`Unexpected: ${msg}`);
      console.error(
        `schedule-review-emails: unexpected error for booking ${booking.id}`,
        err,
      );
      result.errors++;
    }
  }

  return result;
}
