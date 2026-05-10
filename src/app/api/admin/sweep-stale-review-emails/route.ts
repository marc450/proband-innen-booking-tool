import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelScheduledReviewEmail } from "@/lib/cancel-scheduled-review-email";

// One-off cleanup endpoint. Finds course_bookings that are already
// cancelled/refunded but still carry a future-dated, non-fired Resend
// review email, and cancels each one. Mainly exists so we can fix the
// historical state introduced before the new cancellation hooks
// landed. Safe to call repeatedly — idempotent at the per-booking level
// via cancelScheduledReviewEmail().
//
// Staff-only.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // Future-dated scheduled emails on bookings that are no longer active.
  const { data: stale, error } = await admin
    .from("course_bookings")
    .select("id, status, review_email_resend_id, review_email_sent_at")
    .in("status", ["cancelled", "refunded"])
    .not("review_email_resend_id", "is", null)
    .gt("review_email_sent_at", nowIso);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{
    bookingId: string;
    status: string;
    ok: boolean;
    reason?: string;
  }> = [];

  for (const row of stale ?? []) {
    const r = await cancelScheduledReviewEmail(admin, row.id);
    results.push({ bookingId: row.id, status: row.status, ...r });
  }

  return NextResponse.json({
    found: stale?.length ?? 0,
    cancelled: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
