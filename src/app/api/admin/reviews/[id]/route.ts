import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

// PATCH /api/admin/reviews/[id]
// Body: { is_published?: boolean, template_id?: string | null }
// Toggles the moderation flag (stamping published_at on first publish)
// and/or (re)assigns the review to a course. Passing template_id: null
// turns it back into a course-agnostic "Allgemeine Bewertung". At least
// one of the two fields must be present.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { is_published, template_id } = (body || {}) as {
    is_published?: boolean;
    template_id?: string | null;
  };

  const hasPublished = typeof is_published === "boolean";
  // `template_id` is intentionally three-state: absent (don't touch),
  // a string (assign), or explicit null (clear → Allgemeine Bewertung).
  const hasTemplate =
    typeof body === "object" && body !== null && "template_id" in body;
  if (hasTemplate && template_id !== null && typeof template_id !== "string") {
    return NextResponse.json(
      { error: "template_id must be a string or null" },
      { status: 400 },
    );
  }
  if (!hasPublished && !hasTemplate) {
    return NextResponse.json(
      { error: "is_published (boolean) and/or template_id required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Guard against dangling FKs: a non-null template_id must reference a
  // real course_templates row.
  if (hasTemplate && template_id !== null) {
    const { data: tpl } = await admin
      .from("course_templates")
      .select("id")
      .eq("id", template_id)
      .maybeSingle();
    if (!tpl) {
      return NextResponse.json(
        { error: "Unbekannter Kurs (template_id)" },
        { status: 400 },
      );
    }
  }

  const update: Record<string, unknown> = {};
  if (hasTemplate) update.template_id = template_id;
  if (hasPublished) {
    update.is_published = is_published;
    // Stamp published_at the first time a review is published so we can
    // distinguish "freshly approved" from "edited later" without diffing
    // history.
    if (is_published) {
      const { data: existing } = await admin
        .from("course_reviews")
        .select("published_at")
        .eq("id", id)
        .maybeSingle();
      if (existing && !existing.published_at) {
        update.published_at = new Date().toISOString();
      }
    }
  }

  const { error } = await admin
    .from("course_reviews")
    .update(update)
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/reviews/[id]
// Permanently deletes a review. Used for spam or duplicate submissions.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("course_reviews").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
