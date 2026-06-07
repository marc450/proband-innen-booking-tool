// Single LMS lesson: GET (with full body), PATCH (metadata + validated
// body), DELETE. Admin-only.
//
// Body writes go through validateTipTapDoc so a lesson can never be saved
// with a node the reader's renderer cannot render (its `default` branch
// silently drops unknown nodes).
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertLmsAdmin } from "@/lib/lms/admin-auth";
import { LMS_TABLES, badRequest, dbError, unauthorized } from "@/lib/lms/admin-api";
import { slugify, validateTipTapDoc, parseAndValidateDoc } from "@/lib/lms/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await assertLmsAdmin())) return unauthorized();
  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(LMS_TABLES.lessons)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return dbError(error);
  if (!data) return NextResponse.json({ error: "Lektion nicht gefunden." }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await assertLmsAdmin())) return unauthorized();
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
  if (body.lesson_type === "text" || body.lesson_type === "video") {
    patch.lesson_type = body.lesson_type;
  }
  if ("duration_seconds" in body) {
    const d = body.duration_seconds;
    patch.duration_seconds = d === null || d === "" ? null : Number(d);
    if (patch.duration_seconds !== null && !Number.isFinite(patch.duration_seconds)) {
      return badRequest("Dauer muss eine Zahl (Sekunden) sein.");
    }
  }
  if ("cf_stream_video_id" in body) {
    patch.cf_stream_video_id = body.cf_stream_video_id?.toString().trim() || null;
  }
  if ("video_thumbnail_url" in body) {
    patch.video_thumbnail_url = body.video_thumbnail_url?.toString().trim() || null;
  }
  if (typeof body.is_published === "boolean") patch.is_published = body.is_published;

  // Body content: validate against the renderer's node union.
  if ("body" in body) {
    const result =
      typeof body.body === "string"
        ? parseAndValidateDoc(body.body)
        : validateTipTapDoc(body.body);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Der Inhalt enthält ungültige Blöcke.", details: result.errors },
        { status: 400 },
      );
    }
    patch.body = result.doc;
  }

  if (Object.keys(patch).length === 0) return badRequest("Keine Änderungen übermittelt.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(LMS_TABLES.lessons)
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
  if (!(await assertLmsAdmin())) return unauthorized();
  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from(LMS_TABLES.lessons).delete().eq("id", id);
  if (error) return dbError(error);
  return NextResponse.json({ ok: true });
}
