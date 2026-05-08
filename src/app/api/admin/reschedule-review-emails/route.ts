import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { scheduleCourseReviewEmails } from "@/lib/send-course-review-request";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  if (profile.role !== "admin" && profile.role !== "nutzer") return null;
  return user;
}

interface FutureScheduled {
  id: string;
  review_email_resend_id: string | null;
  review_email_sent_at: string | null;
}

// POST /api/admin/reschedule-review-emails
// One-off admin endpoint: cancels every future-scheduled review email
// in Resend, resets the persisted scheduling fields on the booking,
// then re-runs the regular scheduling pass. The new pass picks the
// same bookings up and reschedules them under the current rules
// (currently: 1h before course end).
//
// Why this exists: when the scheduling rule changes (e.g. fire 1h
// before end instead of at end), already-queued Resend emails would
// otherwise fire under the old rule. This route lets us cleanly
// migrate the queue.
//
// Auth: requires staff role (admin or nutzer), same pattern as the
// rest of the /api/admin/* routes. Triggered from a button in the
// Bewertungen moderation UI.
export async function POST(_req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (!RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 },
    );
  }

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  const stats = {
    candidates: 0,
    cancelled: 0,
    cancelFailed: 0,
    resetFailed: 0,
  };

  // Only operate on emails that haven't fired yet. review_email_sent_at
  // is the scheduled wall-clock time; if it's in the past Resend has
  // either already delivered or it's so close that cancelling is racy.
  // Either way: don't touch.
  const { data: future, error: queryErr } = await supabase
    .from("course_bookings")
    .select("id, review_email_resend_id, review_email_sent_at")
    .not("review_email_resend_id", "is", null)
    .gt("review_email_sent_at", nowIso)
    .returns<FutureScheduled[]>();

  if (queryErr) {
    return NextResponse.json({ error: queryErr.message }, { status: 500 });
  }

  for (const row of future ?? []) {
    stats.candidates++;
    if (!row.review_email_resend_id) continue;

    // Cancel via Resend. Endpoint:
    //   POST https://api.resend.com/emails/{id}/cancel
    // Resend returns 200 on success. We treat 404 as "already gone"
    // (delivered, cancelled elsewhere, or stale id) and proceed to the
    // local reset so the next scheduling pass can pick the booking up
    // freshly without orphan state.
    try {
      const res = await fetch(
        `https://api.resend.com/emails/${row.review_email_resend_id}/cancel`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
        },
      );
      if (!res.ok && res.status !== 404) {
        const body = await res.text();
        console.error(
          `reschedule-review-emails: cancel failed for booking ${row.id} (${res.status}): ${body}`,
        );
        stats.cancelFailed++;
        continue;
      }
      stats.cancelled++;
    } catch (err) {
      console.error(
        `reschedule-review-emails: cancel threw for booking ${row.id}`,
        err,
      );
      stats.cancelFailed++;
      continue;
    }

    // Reset scheduling fields so scheduleCourseReviewEmails picks this
    // booking up again. Token is reset too: simpler than threading the
    // existing token through a re-schedule path, and the old token has
    // no value left in the wild because the email never delivered.
    const { error: resetErr } = await supabase
      .from("course_bookings")
      .update({
        review_email_resend_id: null,
        review_email_sent_at: null,
        review_submit_token: null,
      })
      .eq("id", row.id);
    if (resetErr) {
      console.error(
        `reschedule-review-emails: reset failed for booking ${row.id}`,
        resetErr,
      );
      stats.resetFailed++;
    }
  }

  // Re-run the regular scheduling pass so the just-reset bookings get
  // rescheduled with the current rule (1h before end).
  const reschedule = await scheduleCourseReviewEmails(supabase);

  return NextResponse.json({ ok: true, cancelStats: stats, reschedule });
}
