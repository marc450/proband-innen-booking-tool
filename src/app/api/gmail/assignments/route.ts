import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("thread_assignments")
    .select("thread_id, assigned_to, assigned_by, assigned_at, profiles!thread_assignments_assigned_to_fkey(first_name, last_name, title)");

  if (error) {
    // Fallback: if the join fails (FK naming), fetch without join
    const { data: raw } = await supabase
      .from("thread_assignments")
      .select("*");

    if (!raw) return NextResponse.json({});

    // Fetch profile names separately
    const userIds = [...new Set(raw.map((r) => r.assigned_to))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, title")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles || []).map((p) => [
        p.id,
        [p.title, p.first_name, p.last_name].filter(Boolean).join(" ") || "Unbekannt",
      ])
    );

    const assignments: Record<string, { assignedTo: string; assignedToName: string }> = {};
    for (const r of raw) {
      assignments[r.thread_id] = {
        assignedTo: r.assigned_to,
        assignedToName: profileMap.get(r.assigned_to) || "Unbekannt",
      };
    }
    return NextResponse.json(assignments);
  }

  const assignments: Record<string, { assignedTo: string; assignedToName: string }> = {};
  for (const row of data || []) {
    const profile = row.profiles as unknown as { first_name: string | null; last_name: string | null; title: string | null } | null;
    const name = profile
      ? [profile.title, profile.first_name, profile.last_name].filter(Boolean).join(" ")
      : "Unbekannt";
    assignments[row.thread_id] = {
      assignedTo: row.assigned_to,
      assignedToName: name,
    };
  }

  return NextResponse.json(assignments);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { threadId, assignedTo } = await request.json();

  if (!threadId) {
    return NextResponse.json({ error: "threadId required" }, { status: 400 });
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!assignedTo) {
    // Unassign
    await supabase.from("thread_assignments").delete().eq("thread_id", threadId);
    return NextResponse.json({ ok: true });
  }

  // Assign (upsert)
  const { error } = await supabase
    .from("thread_assignments")
    .upsert(
      { thread_id: threadId, assigned_to: assignedTo, assigned_by: user.id },
      { onConflict: "thread_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
