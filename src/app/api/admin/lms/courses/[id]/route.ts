// Single LMS course: PATCH (edit fields / publish), DELETE (cascades to
// chapters + lessons via ON DELETE CASCADE). Admin-only.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertLmsAccess } from "@/lib/lms/admin-auth";
import { LMS_TABLES, badRequest, dbError, unauthorized } from "@/lib/lms/admin-api";
import { slugify } from "@/lib/lms/schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await assertLmsAccess())) return unauthorized();
  const { id } = await params;
  const body = await req.json();

  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string") {
    if (!body.title.trim()) return badRequest("Titel darf nicht leer sein.");
    patch.title = body.title.trim();
  }
  if (typeof body.slug === "string") {
    const s = slugify(body.slug);
    if (!s) return badRequest("Ungültiger Slug.");
    patch.slug = s;
  }
  if ("subtitle" in body) patch.subtitle = body.subtitle?.toString().trim() || null;
  if ("description" in body) patch.description = body.description?.toString().trim() || null;
  if ("cover_image_url" in body) patch.cover_image_url = body.cover_image_url?.toString().trim() || null;
  if ("audience_tag" in body) patch.audience_tag = body.audience_tag?.toString().trim() || null;
  if (body.access_type === "free" || body.access_type === "enrolled") patch.access_type = body.access_type;
  if (body.course_kind === "course" || body.course_kind === "cme_fallstudie") {
    patch.course_kind = body.course_kind;
    // A CME-Fallstudie is always free; keep the two fields consistent.
    if (body.course_kind === "cme_fallstudie") patch.access_type = "free";
  }
  if (typeof body.is_published === "boolean") patch.is_published = body.is_published;

  if (Object.keys(patch).length === 0) return badRequest("Keine Änderungen übermittelt.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(LMS_TABLES.courses)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return dbError(error);
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await assertLmsAccess())) return unauthorized();
  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from(LMS_TABLES.courses).delete().eq("id", id);
  if (error) return dbError(error);
  return NextResponse.json({ ok: true });
}
