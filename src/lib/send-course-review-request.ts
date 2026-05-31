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

// Live copy: fired 1h before course end, doctor is still in the room.
const REVIEW_INTRO_LIVE =
  "vielen Dank, dass Du heute bei uns bist. Solange Dein Eindruck noch frisch ist, ist Dein Feedback für uns am wertvollsten. Bitte nimm Dir 1 Minute, bevor Du gehst.";

// Retroactive copy: one-time pass to past attendees, the course was a
// while ago. No "heute", and it names why the review helps medically. The
// SONJA x EPHIA shirt Verlosung is no longer baked into this sentence; it
// lives in its own highlighted box (REVIEW_RAFFLE_HIGHLIGHT) below.
const REVIEW_INTRO_RETRO =
  "schön, dass Du bei uns im Kurs warst. Wenn es Dir bei uns gefallen hat, würden wir uns riesig über Deine Bewertung freuen. Jede Bewertung unterstützt uns enorm und hilft uns, die Kurse noch besser zu machen.";

// One-time SONJA x EPHIA shirt Verlosung (3 shirts among all reviewers).
// Plain emphasized text appended to the intro so it sits ABOVE the CTA
// button. Remove this line once the promo ends.
const REVIEW_RAFFLE_LINE =
  '<strong>Gewinne ein SONJA x EPHIA Shirt:</strong> Unter allen, die eine Bewertung abgeben, verlosen wir 3 ' +
  '<a href="https://ephia.de/merch/sonja-x-ephia-shirt?color=Weiss" target="_blank" style="color:#0066FF; text-decoration:underline;">SONJA x EPHIA Shirts</a>.';

function buildReviewEmailHtml(opts: {
  firstName: string;
  reviewUrl: string;
  intro?: string;
}): string {
  return buildEmailHtml({
    firstName: opts.firstName,
    intro: opts.intro ?? REVIEW_INTRO_LIVE,
    buttons: [
      {
        label: "Jetzt Bewertung abgeben",
        url: opts.reviewUrl,
      },
    ],
    closing: "Herzliche Grüße,<br>Dein EPHIA-Team",
  });
}

function buildReviewSubject(courseTitle: string): string {
  return `Wie war Dein ${courseTitle}?`;
}

// General subject for the one-time bulk past-attendee pass. A CTA, not a
// question: it names the action (bewerten) and the reward (Shirt gewinnen).
const REVIEW_SUBJECT_GENERAL =
  "Jetzt bewerten und ein SONJA x EPHIA Shirt gewinnen";

interface ScheduleResendResponse {
  id?: string;
}

async function scheduleViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  // Omit to send immediately. The rolling cron passes a future time;
  // the past-participant pass leaves it undefined so Resend fires now.
  scheduledAtIso?: string;
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
      ...(opts.scheduledAtIso ? { scheduled_at: opts.scheduledAtIso } : {}),
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

// ── One-time bulk pass: review requests to the doctor base ─────────────────

// One doctor (auszubildende). The review request is GENERAL and anchored on
// the doctor, not a booking, so doctors with no course_bookings row (LW
// enrollees, legacy imports, contacts) are reachable too. `existingToken` is
// reused when present so any link already in their inbox keeps working.
interface DoctorReviewCandidate {
  auszubildendeId: string;
  email: string;
  firstName: string;
  existingToken: string | null;
}

interface DoctorRow {
  id: string;
  first_name: string | null;
  status: string | null;
  contact_type: string | null;
  review_submit_token: string | null;
  auszubildende_emails:
    | { email: string | null; is_primary: boolean | null }[]
    | { email: string | null; is_primary: boolean | null }
    | null;
}

// True if the session is still upcoming (not yet finished). A doctor with any
// upcoming in-person session hasn't taken that course yet, so we hold off
// asking them for a review. Prefer the precise wall-clock end; fall back to a
// date comparison in Europe/Berlin. Returns false when no date is known so an
// undated session never excludes anyone.
function isFutureSession(session: SessionRow, nowMs: number): boolean {
  const endAt = computeSessionEnd(session);
  if (endAt) return endAt.getTime() >= nowMs;
  if (!session.date_iso) return false;
  const todayBerlin = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
  }).format(new Date(nowMs));
  return session.date_iso >= todayBerlin;
}

// Doctors who have any booking on an upcoming session. Excluded from the pass
// because they haven't taken that course yet.
async function doctorsWithUpcomingSession(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("course_bookings")
    .select(
      `auszubildende_id,
       course_sessions ( id, date_iso, start_time, duration_minutes )`,
    )
    .not("auszubildende_id", "is", null)
    .in("status", ["booked", "completed"]);
  if (error) throw new Error(error.message);

  const nowMs = Date.now();
  const set = new Set<string>();
  for (const row of data ?? []) {
    const session = Array.isArray(row.course_sessions)
      ? row.course_sessions[0]
      : row.course_sessions;
    if (row.auszubildende_id && session && isFutureSession(session, nowMs)) {
      set.add(row.auszubildende_id as string);
    }
  }
  return set;
}

// Doctors who already left a review, whether anchored directly on the doctor
// (auszubildende_id) or on one of their bookings (booking_id → auszubildende).
async function doctorsWithReview(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const { data: reviews, error } = await supabase
    .from("course_reviews")
    .select("auszubildende_id, booking_id");
  if (error) throw new Error(error.message);

  const set = new Set<string>();
  const bookingIds: string[] = [];
  for (const r of reviews ?? []) {
    if (r.auszubildende_id) set.add(r.auszubildende_id as string);
    else if (r.booking_id) bookingIds.push(r.booking_id as string);
  }
  if (bookingIds.length > 0) {
    const { data: bookings } = await supabase
      .from("course_bookings")
      .select("id, auszubildende_id")
      .in("id", bookingIds);
    for (const b of bookings ?? []) {
      if (b.auszubildende_id) set.add(b.auszubildende_id as string);
    }
  }
  return set;
}

// Selects doctors eligible for the one-time GENERAL review request: every
// doctor contact (contact_type 'auszubildende' or legacy null) that is active,
// has a primary email, and has NOT been emailed by this pass yet. Excluded:
// doctors who already left any review, and doctors with any upcoming in-person
// session (course not taken yet). Shared by the count (GET) and send (POST)
// paths so they never diverge.
async function selectPastReviewCandidates(
  supabase: SupabaseClient,
): Promise<DoctorReviewCandidate[]> {
  const { data, error } = await supabase
    .from("auszubildende")
    .select(
      `id, first_name, status, contact_type, review_submit_token,
       auszubildende_emails ( email, is_primary )`,
    )
    .is("review_request_resent_at", null)
    .returns<DoctorRow[]>();

  if (error) throw new Error(error.message);
  if (!data) return [];

  const [upcoming, reviewed] = await Promise.all([
    doctorsWithUpcomingSession(supabase),
    doctorsWithReview(supabase),
  ]);

  const candidates: DoctorReviewCandidate[] = [];
  for (const row of data) {
    // Doctor contacts only: the explicit type plus legacy rows from before
    // contact_type existed (null). "other"/"company" contacts are skipped.
    const ct = row.contact_type;
    if (!(ct === "auszubildende" || ct == null)) continue;
    if (row.status === "inactive") continue;
    if (upcoming.has(row.id) || reviewed.has(row.id)) continue;

    const emails = Array.isArray(row.auszubildende_emails)
      ? row.auszubildende_emails
      : row.auszubildende_emails
        ? [row.auszubildende_emails]
        : [];
    const email =
      emails.find((e) => e.is_primary)?.email || emails[0]?.email || null;
    if (!email) continue;

    candidates.push({
      auszubildendeId: row.id,
      email,
      firstName: row.first_name?.trim() || "Du",
      existingToken: row.review_submit_token,
    });
  }

  return candidates;
}

export async function countPastReviewCandidates(
  supabase: SupabaseClient,
): Promise<number> {
  const candidates = await selectPastReviewCandidates(supabase);
  return candidates.length;
}

// Marc-triggered one-time pass. NEVER runs on a cron or as a side effect.
// ONE email per doctor (auszubildende). Reuse the doctor's existing review
// token (so any link already in their inbox keeps working) or mint a fresh
// one, send the email immediately via Resend, then stamp
// review_request_resent_at on the doctor so a second click can't re-ping them.
export async function sendPastParticipantReviewEmails(
  supabase: SupabaseClient,
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

  let candidates: DoctorReviewCandidate[];
  try {
    candidates = await selectPastReviewCandidates(supabase);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send-past-review-emails: candidate query failed", msg);
    return { ...result, errors: 1, errorSamples: [`Query: ${msg}`] };
  }

  for (const candidate of candidates) {
    try {
      const token = candidate.existingToken || buildToken();

      // Persist the token on the doctor first so a successful Resend call
      // always has a matching DB row for submit-review to validate against.
      const { error: tokenErr } = await supabase
        .from("auszubildende")
        .update({ review_submit_token: token })
        .eq("id", candidate.auszubildendeId);
      if (tokenErr) {
        captureError(`Token persist: ${tokenErr.message}`);
        result.errors++;
        continue;
      }

      const reviewUrl = `${APP_URL}/bewertung/${token}`;
      const html = buildReviewEmailHtml({
        firstName: candidate.firstName,
        reviewUrl,
        intro: `${REVIEW_INTRO_RETRO}<br><br>${REVIEW_RAFFLE_LINE}`,
      });

      let resendId: string;
      try {
        resendId = await scheduleViaResend({
          to: candidate.email,
          subject: REVIEW_SUBJECT_GENERAL,
          html,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        captureError(`Resend: ${msg}`);
        result.errors++;
        await sleep(RESEND_RATE_LIMIT_DELAY_MS);
        continue;
      }

      // review_request_resent_at on the doctor is the sole idempotency marker
      // for this pass, so a re-click never queues a second email for them.
      void resendId;
      const { error: markErr } = await supabase
        .from("auszubildende")
        .update({ review_request_resent_at: new Date().toISOString() })
        .eq("id", candidate.auszubildendeId);
      if (markErr) {
        captureError(`DB mark: ${markErr.message}`);
        result.errors++;
        await sleep(RESEND_RATE_LIMIT_DELAY_MS);
        continue;
      }

      result.scheduled++;
      await sleep(RESEND_RATE_LIMIT_DELAY_MS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      captureError(`Unexpected: ${msg}`);
      console.error(
        `send-past-review-emails: unexpected error for ${candidate.email}`,
        err,
      );
      result.errors++;
    }
  }

  return result;
}
