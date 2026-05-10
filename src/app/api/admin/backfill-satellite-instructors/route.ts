import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveInstructorIdFromName } from "@/lib/resolve-instructor-id";

// Backfill instructor_id on existing Proband:innen satellite courses.
// Reason: until the resolve-instructor-id helper landed, the satellite
// auto-create did a brittle name match (with an is_dozent gate) that
// failed for several real doctors and left courses.instructor_id NULL,
// which in turn hid the "Kursleitende Ärzt:in" row on the public booking
// cards.
//
// This endpoint walks every linked satellite (courses.session_id NOT
// NULL) where instructor_id is currently NULL, looks up the linked
// session's instructor_name, runs it through the new resolver, and
// patches the row when there's a match.
//
// Idempotent and safe to call repeatedly. Staff-only.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Pull every linked satellite that's missing an instructor_id, with
  // the session's instructor_name joined in. We explicitly do NOT filter
  // on course_date — historical satellites are fine to fix too, even if
  // the booking page doesn't render them anymore.
  const { data: rows, error } = await admin
    .from("courses")
    .select("id, course_sessions!inner(instructor_name)")
    .is("instructor_id", null)
    .not("session_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{
    courseId: string;
    instructorName: string | null;
    matched: boolean;
  }> = [];

  for (const row of rows ?? []) {
    const session = Array.isArray(row.course_sessions)
      ? row.course_sessions[0]
      : row.course_sessions;
    const instructorName = (session?.instructor_name as string | null) ?? null;
    const instructorId = await resolveInstructorIdFromName(admin, instructorName);

    if (instructorId) {
      await admin
        .from("courses")
        .update({ instructor_id: instructorId })
        .eq("id", row.id as string);
    }
    results.push({
      courseId: row.id as string,
      instructorName,
      matched: !!instructorId,
    });
  }

  return NextResponse.json({
    scanned: results.length,
    patched: results.filter((r) => r.matched).length,
    unresolved: results.filter((r) => !r.matched),
  });
}
