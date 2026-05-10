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

  // Pull every course that's missing an instructor_id. The only
  // source for a name is the linked course_sessions.instructor_name
  // (the legacy courses.instructor text column was dropped in
  // production even though the migration is still in the repo). When
  // session_id is NULL there's nothing to derive from — those rows
  // come back with source "none" so the caller can see them and set
  // them manually.
  const { data: rows, error } = await admin
    .from("courses")
    .select(
      "id, title, course_date, session_id, course_sessions(instructor_name)",
    )
    .is("instructor_id", null)
    .order("course_date", { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{
    courseId: string;
    title: string | null;
    courseDate: string | null;
    sessionId: string | null;
    instructorName: string | null;
    source: "session" | "none";
    matched: boolean;
  }> = [];

  for (const row of rows ?? []) {
    const session = Array.isArray(row.course_sessions)
      ? row.course_sessions[0]
      : row.course_sessions;
    const sessionName = (session?.instructor_name as string | null) ?? null;

    const instructorName = sessionName;
    const source: "session" | "none" = sessionName ? "session" : "none";

    const instructorId = sessionName
      ? await resolveInstructorIdFromName(admin, sessionName)
      : null;

    if (instructorId) {
      await admin
        .from("courses")
        .update({ instructor_id: instructorId })
        .eq("id", row.id as string);
    }
    results.push({
      courseId: row.id as string,
      title: (row.title as string | null) ?? null,
      courseDate: (row.course_date as string | null) ?? null,
      sessionId: (row.session_id as string | null) ?? null,
      instructorName,
      source,
      matched: !!instructorId,
    });
  }

  return NextResponse.json({
    scanned: results.length,
    patched: results.filter((r) => r.matched).length,
    // Everything that didn't get patched, with diagnostic columns so
    // staff can see whether the gap is a name mismatch (source=session,
    // matched=false) or a missing session linkage (source=none).
    unresolved: results.filter((r) => !r.matched),
  });
}
