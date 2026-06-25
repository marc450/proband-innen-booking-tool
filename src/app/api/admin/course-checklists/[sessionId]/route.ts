import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedStaff } from "@/lib/auth-verify";
import { isValidChecklistKey } from "@/lib/course-checklist";

// Toggle a single checklist item for a course session. The checklist is
// shared per course, so any staff member (admin or nutzer) may tick any
// item. Rows are created lazily: the first tick upserts a row keyed by
// (course_session_id, item_key).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const access = await requireVerifiedStaff();
  if (!access)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { sessionId } = await params;
  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { item_key: itemKey, checked } = body as {
    item_key?: unknown;
    checked?: unknown;
  };
  if (!isValidChecklistKey(itemKey))
    return NextResponse.json({ error: "Unbekannter Eintrag." }, { status: 400 });
  if (typeof checked !== "boolean")
    return NextResponse.json({ error: "Ungültiger Wert." }, { status: 400 });

  const admin = createAdminClient();

  // Make sure the session exists so we don't create orphaned rows.
  const { data: session } = await admin
    .from("course_sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session)
    return NextResponse.json(
      { error: "Kurstermin nicht gefunden." },
      { status: 404 },
    );

  const { data: row, error } = await admin
    .from("course_checklist_items")
    .upsert(
      {
        course_session_id: sessionId,
        item_key: itemKey,
        checked,
        checked_by: checked ? access.userId : null,
        checked_at: checked ? new Date().toISOString() : null,
      },
      { onConflict: "course_session_id,item_key" },
    )
    .select("item_key, checked, checked_at, checked_by")
    .single();

  if (error || !row)
    return NextResponse.json(
      { error: error?.message || "Speichern fehlgeschlagen." },
      { status: 500 },
    );

  return NextResponse.json({ item: row });
}
