import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  countPastReviewCandidates,
  sendPastParticipantReviewEmails,
} from "@/lib/send-course-review-request";

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

// GET /api/admin/send-past-review-requests
// Returns how many past attendees would receive a review request right now.
// Read-only; sends nothing. Used to populate the confirm dialog so Marc
// sees the recipient count before triggering the send.
export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const supabase = createAdminClient();
  try {
    const count = await countPastReviewCandidates(supabase);
    return NextResponse.json({ count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/admin/send-past-review-requests
// One-time, explicitly Marc-triggered bulk send. For every past attendee
// without a review yet, sends the tokenized review-request email
// immediately and stamps review_request_resent_at so it can't repeat.
export async function POST() {
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
  const result = await sendPastParticipantReviewEmails(supabase);
  return NextResponse.json({ ok: true, result });
}
