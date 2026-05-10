import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sweepStaleReviewEmails } from "@/lib/cancel-scheduled-review-email";

// Manual trigger for the same sweep that runs nightly inside
// /api/send-reminders. Kept as a staff-only endpoint so we can clean up
// drift on demand without waiting for the cron.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sweepStaleReviewEmails(createAdminClient());
  return NextResponse.json(result);
}
