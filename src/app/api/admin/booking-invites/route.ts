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
    .select("*, course_templates(title), course_sessions(label_de, date_iso)")
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
    stripePromotionCodeId,
    recipientEmail,
    recipientName,
    adminNote,
    expiresAt,
  } = body as {
    templateId?: string;
    sessionId?: string | null;
    courseType?: string;
    stripePromotionCodeId?: string | null;
    recipientEmail?: string | null;
    recipientName?: string | null;
    adminNote?: string | null;
    expiresAt?: string | null;
  };

  if (!templateId) {
    return NextResponse.json({ error: "templateId ist erforderlich." }, { status: 400 });
  }
  if (!courseType || !ALLOWED_COURSE_TYPES.has(courseType)) {
    return NextResponse.json(
      { error: `courseType muss einer von ${[...ALLOWED_COURSE_TYPES].join(", ")} sein.` },
      { status: 400 },
    );
  }
  // Praxiskurs/Kombikurs/Premium ALL bind to a session — only Onlinekurs
  // skips it. Enforce that so the invite always leads to something bookable.
  if (courseType !== "Onlinekurs" && !sessionId) {
    return NextResponse.json(
      { error: `Für ${courseType} muss eine session_id angegeben werden.` },
      { status: 400 },
    );
  }

  const token = randomBytes(16).toString("hex"); // 32 hex chars

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("booking_invites")
    .insert({
      token,
      template_id: templateId,
      session_id: sessionId || null,
      course_type: courseType,
      stripe_promotion_code_id: stripePromotionCodeId?.trim() || null,
      recipient_email: recipientEmail?.trim().toLowerCase() || null,
      recipient_name: recipientName?.trim() || null,
      admin_note: adminNote?.trim() || null,
      expires_at: expiresAt || null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
