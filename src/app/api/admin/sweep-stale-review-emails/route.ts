import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sweepStaleReviewEmails } from "@/lib/cancel-scheduled-review-email";
import { requireVerifiedAdmin } from "@/lib/auth-verify";

// Manual trigger for the same sweep that runs nightly inside
// /api/send-reminders. Kept as a staff-only endpoint so we can clean up
// drift on demand without waiting for the cron.
export async function POST() {
  if (!(await requireVerifiedAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const result = await sweepStaleReviewEmails(createAdminClient());
  return NextResponse.json(result);
}
