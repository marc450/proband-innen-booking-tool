// LMS lessons: POST create (scoped to a chapter). New lessons start as
// an empty draft doc. Admin-only.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertLmsAdmin } from "@/lib/lms/admin-auth";
import { LMS_TABLES, badRequest, dbError, nextOrderIndex, unauthorized } from "@/lib/lms/admin-api";
import { slugify } from "@/lib/lms/schema";

export async function POST(req: NextRequest) {
  if (!(await assertLmsAdmin())) return unauthorized();

  const body = await req.json();
  const chapter_id = typeof body.chapter_id === "string" ? body.chapter_id : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!chapter_id) return badRequest("chapter_id ist erforderlich.");
  if (!title) return badRequest("Titel ist erforderlich.");

  const slug = (typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : slugify(title));
  if (!slug) return badRequest("Aus dem Titel konnte kein gültiger Slug gebildet werden.");

  const lesson_type = body.lesson_type === "video" ? "video" : "text";

  const admin = createAdminClient();
  const order_index = await nextOrderIndex(admin, LMS_TABLES.lessons, {
    column: "chapter_id",
    value: chapter_id,
  });

  const { data, error } = await admin
    .from(LMS_TABLES.lessons)
    .insert({
      chapter_id,
      title,
      slug,
      lesson_type,
      duration_seconds: null,
      body: { type: "doc", content: [] },
      cf_stream_video_id: null,
      video_thumbnail_url: null,
      is_published: false,
      order_index,
    })
    .select("*")
    .single();
  if (error) return dbError(error);
  return NextResponse.json(data);
}
