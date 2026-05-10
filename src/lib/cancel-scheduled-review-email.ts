import type { SupabaseClient } from "@supabase/supabase-js";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;

export interface SweepResult {
  found: number;
  cancelled: number;
  failed: number;
}

// Find course_bookings that are no longer active (cancelled/refunded) but
// still carry a future-dated Resend review email, and cancel each one.
// Defensive cleanup that catches drift from any path that fails to call
// cancelScheduledReviewEmail — silent fetch failures in the dashboard,
// direct DB edits, future code paths that forget the hook, etc.
//
// Idempotent: safe to call repeatedly. Each per-booking cancel goes
// through cancelScheduledReviewEmail() which clears the bookkeeping
// columns, so the next sweep won't re-pick the same row.
export async function sweepStaleReviewEmails(
  supabase: SupabaseClient,
): Promise<SweepResult> {
  const nowIso = new Date().toISOString();
  const { data: stale, error } = await supabase
    .from("course_bookings")
    .select("id")
    .in("status", ["cancelled", "refunded"])
    .not("review_email_resend_id", "is", null)
    .gt("review_email_sent_at", nowIso);

  if (error) {
    console.error("sweepStaleReviewEmails: query failed", error);
    return { found: 0, cancelled: 0, failed: 1 };
  }

  let cancelled = 0;
  let failed = 0;
  for (const row of stale ?? []) {
    const r = await cancelScheduledReviewEmail(supabase, row.id);
    if (r.ok) cancelled++;
    else failed++;
  }
  return { found: stale?.length ?? 0, cancelled, failed };
}

// Cancel the Resend-scheduled review-request email for a single booking
// and clear the bookkeeping columns. Designed for the cancellation /
// refund flow: when a booking moves out of the "active" set, the review
// email scheduled to fire 1h before course end must not still go out.
//
// Idempotent and best-effort:
//   - No row, no scheduled email, or the email already fired? Returns ok.
//   - Resend returns 404 (already gone)? Treated as success, columns get cleared.
//   - Any other Resend error is surfaced via `reason` so callers can log
//     it without aborting their main flow (the booking should still be
//     marked cancelled even if Resend cleanup fails — operationally a
//     stale send is better than a stale status).
export async function cancelScheduledReviewEmail(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const { data: booking, error } = await supabase
    .from("course_bookings")
    .select("id, review_email_resend_id, review_email_sent_at")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) return { ok: false, reason: "booking-not-found" };
  if (!booking.review_email_resend_id) return { ok: true, reason: "nothing-scheduled" };

  // If the scheduled time is already in the past, Resend has either
  // dispatched it or rejected it long ago. Either way, calling cancel is
  // a no-op; just clear the columns so future runs don't re-attempt.
  const sentAt = booking.review_email_sent_at
    ? new Date(booking.review_email_sent_at).getTime()
    : null;
  const alreadyFired = sentAt !== null && sentAt <= Date.now();

  let resendOk = true;
  let resendReason: string | undefined;
  if (!alreadyFired) {
    const res = await fetch(
      `https://api.resend.com/emails/${booking.review_email_resend_id}/cancel`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      },
    );
    // 200 = cancelled, 404 = already gone (also fine for our purposes).
    // 422 typically means the email is in-flight or already sent —
    // out of our hands at that point.
    if (!res.ok && res.status !== 404) {
      resendOk = false;
      resendReason = `resend-${res.status}`;
    }
  }

  // Always clear the local columns when we made *some* effort, so the
  // booking row reflects "no review email pending" even if Resend
  // didn't cooperate. The fire window is past the point of recovery.
  await supabase
    .from("course_bookings")
    .update({ review_email_resend_id: null, review_email_sent_at: null })
    .eq("id", bookingId);

  if (alreadyFired) return { ok: true, reason: "already-fired" };
  return { ok: resendOk, reason: resendReason };
}
