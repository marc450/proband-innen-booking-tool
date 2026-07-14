import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelScheduledReviewEmail } from "@/lib/cancel-scheduled-review-email";
import { requireVerifiedAdmin } from "@/lib/auth-verify";

// Staff-only endpoint. Called from dashboard status dropdowns that flip a
// course_booking to "cancelled" / "refunded" via direct DB update (i.e.
// not through /api/cancel-course-booking). Without this, those dropdown
// flows would leave the Resend-scheduled review email in place and the
// doctor still gets a "wie war Dein Kurs?" email after a manual cancel.
//
// Idempotent: safe to call even if no email is scheduled.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;

  if (!(await requireVerifiedAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const admin = createAdminClient();
  const result = await cancelScheduledReviewEmail(admin, bookingId);

  return NextResponse.json(result);
}
