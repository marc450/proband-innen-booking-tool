import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEmailHtml } from "@/lib/email-template";
import { decryptPatient } from "@/lib/encryption";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;

// Proband-facing review form lives on the booking domain. The path is
// deliberately NOT /bewertung (that one 308-redirects to ephia.de for the
// doctor flow); /proband-bewertung passes through untouched on this host.
const APP_URL = "https://proband-innen.ephia.de";

// Resend's default API rate limit is 2 requests/sec. Wait 600ms between sends
// so a bulk pass doesn't get half its requests 429'd.
const RESEND_RATE_LIMIT_DELAY_MS = 600;

const REVIEW_EMAIL_FROM = "EPHIA <customerlove@ephia.de>";

const REVIEW_SUBJECT = "Wie war Deine Behandlung bei EPHIA?";
const REVIEW_INTRO =
  "vielen Dank, dass Du als Proband:in bei einem unserer Kurse dabei warst. Wenn es Dir bei uns gefallen hat, würden wir uns riesig über Deine Bewertung freuen. Dein Feedback hilft uns sehr und unterstützt uns dabei, die Behandlungen noch besser zu machen.";

// Copy for the automated post-treatment sweep: the proband was treated a
// day or two ago, so the framing is "kürzlich" rather than the manual
// pass's open-ended "bei einem unserer Kurse".
const REVIEW_INTRO_POST_TREATMENT =
  "vielen Dank, dass Du kürzlich als Proband:in bei uns warst. Solange Dein Eindruck noch frisch ist, freuen wir uns riesig über Deine Bewertung. Dein Feedback hilft uns sehr und unterstützt uns dabei, die Behandlungen noch besser zu machen.";

// Post-treatment sweep timing. Wait at least 24h after the slot ends
// before asking, so staff have time to mark no-shows (no-show probands
// are billed 50 EUR and must never get a review request). Only look back
// POST_TREATMENT_WINDOW_DAYS so a first run doesn't blast the back catalog;
// the manual "Vergangene anschreiben" button covers older attendees.
const POST_TREATMENT_MIN_AGE_HOURS = 24;
const POST_TREATMENT_WINDOW_DAYS = 7;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

interface ScheduleResult {
  scheduled: number;
  skipped: number;
  errors: number;
  /** Up to first 3 error messages, surfaced for UI debugging. */
  errorSamples: string[];
}

interface ProbandReviewCandidate {
  patientId: string;
  email: string;
  firstName: string;
  existingToken: string | null;
}

function buildToken(): string {
  return randomBytes(32).toString("base64url");
}

function buildReviewEmailHtml(opts: {
  firstName: string;
  reviewUrl: string;
  intro?: string;
}): string {
  return buildEmailHtml({
    firstName: opts.firstName,
    intro: opts.intro ?? REVIEW_INTRO,
    buttons: [{ label: "Jetzt Bewertung abgeben", url: opts.reviewUrl }],
    closing: "Herzliche Grüße,<br>Dein EPHIA-Team",
  });
}

interface ScheduleResendResponse {
  id?: string;
}

async function sendViaResend(opts: {
  to: string;
  subject: string;
  html: string;
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
      tags: [{ name: "ephia-purpose", value: "proband-review-request" }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend send failed (${res.status}): ${errText}`);
  }
  const json = (await res.json()) as ScheduleResendResponse;
  if (!json.id) throw new Error("Resend response missing email id");
  return json.id;
}

// Probands with any non-cancelled booking on a future slot. Excluded from the
// pass because their treatment hasn't happened yet. slots.start_time is a
// timestamptz, so a direct comparison against "now" is enough.
async function probandsWithFutureBooking(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`patient_id, status, slots ( start_time )`)
    .not("patient_id", "is", null)
    .neq("status", "cancelled");
  if (error) throw new Error(error.message);

  const nowMs = Date.now();
  const set = new Set<string>();
  for (const row of data ?? []) {
    const slot = Array.isArray(row.slots) ? row.slots[0] : row.slots;
    if (!slot?.start_time) continue;
    const startMs = new Date(slot.start_time).getTime();
    if (!Number.isNaN(startMs) && startMs > nowMs && row.patient_id) {
      set.add(row.patient_id as string);
    }
  }
  return set;
}

// Probands who already left a review.
async function probandsWithReview(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("proband_reviews")
    .select("patient_id");
  if (error) throw new Error(error.message);
  const set = new Set<string>();
  for (const r of data ?? []) {
    if (r.patient_id) set.add(r.patient_id as string);
  }
  return set;
}

// Probands whose treatment ended recently enough to ask for a review, but
// long enough ago that staff have had time to mark no-shows. Returns the
// patient ids of attendees of any non-cancelled, non-no_show booking whose
// slot end (fallback start) falls in [now - WINDOW_DAYS, now - MIN_AGE_HOURS].
// No-show probands are billed 50 EUR and must never be asked, so they are
// excluded here by status.
async function probandsWithRecentEndedTreatment(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`patient_id, status, slots ( start_time, end_time )`)
    .not("patient_id", "is", null)
    .neq("status", "cancelled")
    .neq("status", "no_show");
  if (error) throw new Error(error.message);

  const nowMs = Date.now();
  const upperMs = nowMs - POST_TREATMENT_MIN_AGE_HOURS * 60 * 60 * 1000;
  const lowerMs = nowMs - POST_TREATMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const set = new Set<string>();
  for (const row of data ?? []) {
    const slot = Array.isArray(row.slots) ? row.slots[0] : row.slots;
    const endRaw = slot?.end_time || slot?.start_time;
    if (!endRaw || !row.patient_id) continue;
    const endMs = new Date(endRaw).getTime();
    if (Number.isNaN(endMs)) continue;
    if (endMs >= lowerMs && endMs <= upperMs) {
      set.add(row.patient_id as string);
    }
  }
  return set;
}

// Selects probands eligible for the review request: every patient that is
// active (not inactive/blacklist), has a decryptable email, and has NOT been
// emailed yet (review_request_resent_at IS NULL). Excluded: probands who
// already reviewed, and probands with any upcoming booking (treatment not done
// yet). When `restrictTo` is given, only patients in that set are considered
// (used by the automated post-treatment sweep). Shared by the manual count
// (GET), manual send (POST), and the cron path so they never diverge.
async function selectProbandReviewCandidates(
  supabase: SupabaseClient,
  restrictTo?: Set<string>,
): Promise<ProbandReviewCandidate[]> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .is("review_request_resent_at", null);
  if (error) throw new Error(error.message);
  if (!data) return [];

  const [future, reviewed] = await Promise.all([
    probandsWithFutureBooking(supabase),
    probandsWithReview(supabase),
  ]);

  const candidates: ProbandReviewCandidate[] = [];
  const seenEmails = new Set<string>();
  for (const row of data) {
    if (restrictTo && !restrictTo.has(row.id)) continue;
    // Deliverability/safety: never ask blacklisted (banned) or inactive
    // (unsubscribed/invalid) probands for a review.
    if (row.patient_status === "inactive" || row.patient_status === "blacklist")
      continue;
    if (future.has(row.id) || reviewed.has(row.id)) continue;

    const patient = decryptPatient(row);
    const email = patient.email?.trim();
    if (!email) continue;
    // Dedupe in case two patient rows share an email.
    const key = email.toLowerCase();
    if (seenEmails.has(key)) continue;
    seenEmails.add(key);

    candidates.push({
      patientId: row.id,
      email,
      firstName: patient.first_name?.trim() || "Du",
      existingToken: row.review_submit_token ?? null,
    });
  }

  return candidates;
}

export async function countProbandReviewCandidates(
  supabase: SupabaseClient,
): Promise<number> {
  const candidates = await selectProbandReviewCandidates(supabase);
  return candidates.length;
}

// Shared send loop for both the manual bulk pass and the automated
// post-treatment sweep. ONE email per proband: reuse the proband's existing
// token (so any link already in their inbox keeps working) or mint a fresh
// one, send immediately via Resend, then stamp review_request_resent_at so a
// second pass can't re-ping them. review_request_resent_at is the sole shared
// idempotency marker across both callers.
async function dispatchProbandReviewEmails(
  supabase: SupabaseClient,
  candidates: ProbandReviewCandidate[],
  intro?: string,
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

  for (const candidate of candidates) {
    try {
      const token = candidate.existingToken || buildToken();

      // Persist the token on the proband first so a successful Resend call
      // always has a matching DB row for submit-proband-review to validate.
      const { error: tokenErr } = await supabase
        .from("patients")
        .update({ review_submit_token: token })
        .eq("id", candidate.patientId);
      if (tokenErr) {
        captureError(`Token persist: ${tokenErr.message}`);
        result.errors++;
        continue;
      }

      const reviewUrl = `${APP_URL}/proband-bewertung/${token}`;
      const html = buildReviewEmailHtml({
        firstName: candidate.firstName,
        reviewUrl,
        intro,
      });

      try {
        await sendViaResend({
          to: candidate.email,
          subject: REVIEW_SUBJECT,
          html,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        captureError(`Resend: ${msg}`);
        result.errors++;
        await sleep(RESEND_RATE_LIMIT_DELAY_MS);
        continue;
      }

      const { error: markErr } = await supabase
        .from("patients")
        .update({ review_request_resent_at: new Date().toISOString() })
        .eq("id", candidate.patientId);
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
        `dispatch-proband-review-emails: unexpected error for ${candidate.email}`,
        err,
      );
      result.errors++;
    }
  }

  return result;
}

// Marc-triggered one-time pass over the whole eligible back catalog. NEVER
// runs on a cron or as a side effect.
export async function sendPastProbandReviewEmails(
  supabase: SupabaseClient,
): Promise<ScheduleResult> {
  let candidates: ProbandReviewCandidate[];
  try {
    candidates = await selectProbandReviewCandidates(supabase);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send-past-proband-review-emails: candidate query failed", msg);
    return { scheduled: 0, skipped: 0, errors: 1, errorSamples: [`Query: ${msg}`] };
  }
  return dispatchProbandReviewEmails(supabase, candidates);
}

// Automated daily sweep. Asks every proband whose treatment ended in the last
// POST_TREATMENT_WINDOW_DAYS (but at least POST_TREATMENT_MIN_AGE_HOURS ago) for
// a review, exactly once. No-show / cancelled bookings are excluded upstream in
// probandsWithRecentEndedTreatment, and review_request_resent_at guarantees one
// email per proband across this sweep and the manual pass.
export async function sendPostTreatmentProbandReviews(
  supabase: SupabaseClient,
): Promise<ScheduleResult> {
  let candidates: ProbandReviewCandidate[];
  try {
    const treated = await probandsWithRecentEndedTreatment(supabase);
    if (treated.size === 0) {
      return { scheduled: 0, skipped: 0, errors: 0, errorSamples: [] };
    }
    candidates = await selectProbandReviewCandidates(supabase, treated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send-post-treatment-proband-reviews: candidate query failed", msg);
    return { scheduled: 0, skipped: 0, errors: 1, errorSamples: [`Query: ${msg}`] };
  }
  return dispatchProbandReviewEmails(
    supabase,
    candidates,
    REVIEW_INTRO_POST_TREATMENT,
  );
}
