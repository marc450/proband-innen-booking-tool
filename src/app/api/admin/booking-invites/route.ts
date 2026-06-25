import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";

/**
 * Admin-only CRUD for booking_invites. These are single-use links that let
 * a specific recipient book a seat in an Auszubildende course even when
 * the session is already full. The public /einladung/[token] flow and the
 * Stripe webhook resolve the invite, bypass the capacity guard, and mark
 * the token as used.
 */

async function assertAdmin() {
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
  if (!profile || profile.role !== "admin") return null;
  return user;
}

const ALLOWED_COURSE_TYPES = new Set([
  "Onlinekurs",
  "Praxiskurs",
  "Kombikurs",
  "Premium",
]);

export async function GET() {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("booking_invites")
    .select(
      "*, course_templates(title), course_sessions(label_de, date_iso), booking_invite_courses(template_id, session_id, course_type, sort_order, course_templates(title, course_label_de), course_sessions(label_de, date_iso))",
    )
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const {
    templateId,
    sessionId,
    courseType,
    courses,
    stripePromotionCodeId,
    recipientEmail,
    recipientName,
    adminNote,
    expiresAt,
    rebookingFeeCents,
  } = body as {
    templateId?: string;
    sessionId?: string | null;
    courseType?: string;
    courses?: Array<{ templateId?: string; sessionId?: string | null; courseType?: string }>;
    stripePromotionCodeId?: string | null;
    recipientEmail?: string | null;
    recipientName?: string | null;
    adminNote?: string | null;
    expiresAt?: string | null;
    rebookingFeeCents?: number | null;
  };

  // Normalize to a single course list. The client may send the new
  // `courses` array; fall back to the legacy single-course fields so older
  // callers keep working.
  const courseList = (
    Array.isArray(courses) && courses.length > 0
      ? courses
      : [{ templateId, sessionId, courseType }]
  ).map((c) => ({
    templateId: c.templateId,
    sessionId: c.sessionId || null,
    courseType: c.courseType,
  }));

  // Validate every course. Praxiskurs/Kombikurs/Premium ALL bind to a
  // session, only Onlinekurs skips it, so the invite always leads to
  // something bookable.
  for (const c of courseList) {
    if (!c.templateId) {
      return NextResponse.json({ error: "templateId ist erforderlich." }, { status: 400 });
    }
    if (!c.courseType || !ALLOWED_COURSE_TYPES.has(c.courseType)) {
      return NextResponse.json(
        { error: `courseType muss einer von ${[...ALLOWED_COURSE_TYPES].join(", ")} sein.` },
        { status: 400 },
      );
    }
    if (c.courseType !== "Onlinekurs" && !c.sessionId) {
      return NextResponse.json(
        { error: `Für ${c.courseType} muss eine session_id angegeben werden.` },
        { status: 400 },
      );
    }
  }

  const isMulti = courseList.length >= 2;

  // Umbuchung: a flat fee (cents) that overrides the variant price at
  // checkout. Reject anything that isn't a non-negative integer so a typo
  // can't silently produce a free or fractional charge. Rebooking is a
  // single-course concept, so it never applies to a multi-course invite.
  let rebookingFee: number | null = null;
  if (rebookingFeeCents != null) {
    if (isMulti) {
      return NextResponse.json(
        { error: "Eine Umbuchungsgebühr ist nur für Einladungen mit einem Kurs möglich." },
        { status: 400 },
      );
    }
    if (!Number.isInteger(rebookingFeeCents) || rebookingFeeCents < 0) {
      return NextResponse.json(
        { error: "rebookingFeeCents muss eine ganze Zahl >= 0 sein." },
        { status: 400 },
      );
    }
    rebookingFee = rebookingFeeCents;
  }

  const token = randomBytes(16).toString("hex"); // 32 hex chars
  const admin = createAdminClient();

  // Single-course invites keep the legacy shape (course on the row itself,
  // no junction rows) so the proven single-course flow handles them.
  // Multi-course invites leave the legacy columns NULL and store their
  // courses in booking_invite_courses.
  const single = courseList[0];
  const { data, error } = await admin
    .from("booking_invites")
    .insert({
      token,
      template_id: isMulti ? null : single.templateId,
      session_id: isMulti ? null : single.sessionId,
      course_type: isMulti ? null : single.courseType,
      stripe_promotion_code_id: stripePromotionCodeId?.trim() || null,
      recipient_email: recipientEmail?.trim().toLowerCase() || null,
      recipient_name: recipientName?.trim() || null,
      admin_note: adminNote?.trim() || null,
      expires_at: expiresAt || null,
      rebooking_fee_cents: rebookingFee,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (isMulti) {
    const rows = courseList.map((c, i) => ({
      invite_id: data.id,
      template_id: c.templateId,
      session_id: c.sessionId,
      course_type: c.courseType,
      sort_order: i,
    }));
    const { error: coursesError } = await admin
      .from("booking_invite_courses")
      .insert(rows);
    if (coursesError) {
      // Roll back the orphaned invite so we never leave a multi-course
      // invite with no courses attached.
      await admin.from("booking_invites").delete().eq("id", data.id);
      return NextResponse.json({ error: coursesError.message }, { status: 500 });
    }
  }

  return NextResponse.json(data);
}
