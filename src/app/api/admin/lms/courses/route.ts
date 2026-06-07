// LMS courses collection: GET full admin catalog, POST create.
// Admin-only, service-role writes. Touches only lms_* tables — no
// LearnWorlds / course_templates / course_bookings involvement.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertLmsAdmin } from "@/lib/lms/admin-auth";
import { getAdminCourseCatalog } from "@/lib/lms/admin-queries";
import { LMS_TABLES, badRequest, dbError, nextOrderIndex, unauthorized } from "@/lib/lms/admin-api";
import { slugify } from "@/lib/lms/schema";

export async function GET() {
  if (!(await assertLmsAdmin())) return unauthorized();
  const catalog = await getAdminCourseCatalog();
  return NextResponse.json(catalog);
}

export async function POST(req: NextRequest) {
  if (!(await assertLmsAdmin())) return unauthorized();

  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return badRequest("Titel ist erforderlich.");

  const slug = (typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : slugify(title));
  if (!slug) return badRequest("Aus dem Titel konnte kein gültiger Slug gebildet werden.");

  const admin = createAdminClient();
  const order_index = await nextOrderIndex(admin, LMS_TABLES.courses, null);

  const { data, error } = await admin
    .from(LMS_TABLES.courses)
    .insert({
      title,
      slug,
      subtitle: typeof body.subtitle === "string" ? body.subtitle.trim() || null : null,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      access_type: body.access_type === "enrolled" ? "enrolled" : "free",
      audience_tag: typeof body.audience_tag === "string" ? body.audience_tag.trim() || null : null,
      is_published: false,
      order_index,
    })
    .select("*")
    .single();

  if (error) return dbError(error);
  return NextResponse.json(data);
}
