import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// One-shot end-to-end probe of the bewertung submission flow. Creates a
// synthetic test booking, mints a review_submit_token, calls the same
// /api/submit-review handler the doctor's browser would hit, then checks
// whether a course_reviews row landed. Cleans up the synthetic booking
// at the end (the FK on course_reviews.booking_id with ON DELETE CASCADE
// takes the test review with it).
//
// Staff-only. Designed to make a black-box "does the form really land in
// the admin tool?" question into a structured yes/no answer.

const PROBE_EMAIL = "bewertung-probe@ephia.de";
const PROBE_FIRST_NAME = "BewertungProbe";

interface Step {
  step: string;
  ok: boolean;
  detail?: string;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const steps: Step[] = [];
  let bookingId: string | null = null;
  let reviewId: string | null = null;

  try {
    // 1. Pick any course_template + course_session pair so the FK on
    // course_bookings.template_id is satisfied. We don't really care
    // which template, the test row is throwaway.
    const { data: tpl } = await admin
      .from("course_templates")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (!tpl) {
      steps.push({ step: "find-template", ok: false, detail: "no course_templates rows in DB" });
      return NextResponse.json({ ok: false, steps }, { status: 500 });
    }
    steps.push({ step: "find-template", ok: true, detail: tpl.id as string });

    // 2. Mint a token and insert a synthetic booking carrying it.
    const token = `probe-${randomBytes(16).toString("base64url")}`;
    const { data: inserted, error: insErr } = await admin
      .from("course_bookings")
      .insert({
        template_id: tpl.id,
        course_type: "Praxiskurs",
        first_name: PROBE_FIRST_NAME,
        email: PROBE_EMAIL,
        review_submit_token: token,
        status: "completed",
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      steps.push({
        step: "create-test-booking",
        ok: false,
        detail: insErr?.message || "insert returned nothing",
      });
      return NextResponse.json({ ok: false, steps }, { status: 500 });
    }
    bookingId = inserted.id as string;
    steps.push({ step: "create-test-booking", ok: true, detail: bookingId });

    // 3. Hit the public /api/submit-review just like the doctor's browser
    // would. We use the request's own origin so the probe works no matter
    // which environment it's running in.
    const origin = new URL(req.url).origin;
    const submitRes = await fetch(`${origin}/api/submit-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        rating: 5,
        firstName: PROBE_FIRST_NAME,
        bodyText: "Probe submission, ignore.",
        internalFeedback: "Probe internal feedback, ignore.",
      }),
    });
    const submitJson = await submitRes.json().catch(() => ({}));
    steps.push({
      step: "POST /api/submit-review",
      ok: submitRes.ok,
      detail: `${submitRes.status} ${JSON.stringify(submitJson)}`,
    });
    if (!submitRes.ok) {
      return NextResponse.json({ ok: false, steps }, { status: 500 });
    }

    // 4. Verify a course_reviews row was actually created.
    const { data: review, error: reviewErr } = await admin
      .from("course_reviews")
      .select("id, rating, first_name, is_published, submitted_at")
      .eq("booking_id", bookingId)
      .maybeSingle();
    if (reviewErr) {
      steps.push({
        step: "verify-review-exists",
        ok: false,
        detail: reviewErr.message,
      });
      return NextResponse.json({ ok: false, steps }, { status: 500 });
    }
    if (!review) {
      steps.push({
        step: "verify-review-exists",
        ok: false,
        detail: "no course_reviews row found for the test booking",
      });
      return NextResponse.json({ ok: false, steps }, { status: 500 });
    }
    reviewId = review.id as string;
    steps.push({
      step: "verify-review-exists",
      ok: true,
      detail: `id=${reviewId} rating=${review.rating} first_name=${review.first_name} is_published=${review.is_published} submitted_at=${review.submitted_at}`,
    });

    return NextResponse.json({
      ok: true,
      conclusion:
        "Submission landed in course_reviews and would render in the admin tool's pending tab.",
      steps,
    });
  } finally {
    // Clean up: deleting the booking cascades the review.
    if (bookingId) {
      await admin.from("course_bookings").delete().eq("id", bookingId);
    }
  }
}
