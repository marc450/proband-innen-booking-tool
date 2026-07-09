// LMS chapters: POST create (scoped to a course). Admin-only.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertLmsAccess } from "@/lib/lms/admin-auth";
import { LMS_TABLES, badRequest, dbError, nextOrderIndex, unauthorized } from "@/lib/lms/admin-api";
import { slugify } from "@/lib/lms/schema";

export async function POST(req: NextRequest) {
  if (!(await assertLmsAccess())) return unauthorized();

  const body = await req.json();
  const course_id = typeof body.course_id === "string" ? body.course_id : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!course_id) return badRequest("course_id ist erforderlich.");
  if (!title) return badRequest("Titel ist erforderlich.");

  const slug = (typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : slugify(title));
  if (!slug) return badRequest("Aus dem Titel konnte kein gültiger Slug gebildet werden.");

  const admin = createAdminClient();
  const order_index = await nextOrderIndex(admin, LMS_TABLES.chapters, {
    column: "course_id",
    value: course_id,
  });

  const { data, error } = await admin
    .from(LMS_TABLES.chapters)
    .insert({ course_id, title, slug, is_published: false, order_index })
    .select("*")
    .single();
  if (error) return dbError(error);
  return NextResponse.json(data);
}
