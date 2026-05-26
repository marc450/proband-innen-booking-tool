import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSlackDm } from "@/lib/slack-dm";

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

    // First-name-only display: inbox is staff-internal, full names
    // with title were too long for the assigned pill (Marc, 2026-05).
    const profileMap = new Map(
      (profiles || []).map((p) => [
        p.id,
        p.first_name?.trim() || p.last_name?.trim() || "Unbekannt",
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
    // First-name-only display, see note on profileMap above.
    const name =
      profile?.first_name?.trim() || profile?.last_name?.trim() || "Unbekannt";
    assignments[row.thread_id] = {
      assignedTo: row.assigned_to,
      assignedToName: name,
    };
  }

  return NextResponse.json(assignments);
}

// ---------------------------------------------------------------------------
// Slack DM helper — composes the inbox-assignment message and delegates
// transport to lib/slack-dm.ts (shared with the task-assignment
// notifier). Prefers profiles.slack_user_id, falls back to lookup by
// email inside sendSlackDm.
// ---------------------------------------------------------------------------
async function notifyAssigneeOnSlack(opts: {
  slackUserId: string | null;
  assigneeEmail: string | null;
  assignerName: string;
  threadSubject: string;
  senderEmail: string;
  threadId: string;
}) {
  const { slackUserId, assigneeEmail, assignerName, threadSubject, senderEmail, threadId } = opts;
  // The inbox lives behind staff auth on admin.ephia.de.
  // NEXT_PUBLIC_APP_URL points at the public booking domain
  // (proband-innen.ephia.de), which rewrites /dashboard/* to
  // /not-found, so we hardcode admin.ephia.de here.
  const text = `📩 *${assignerName}* hat Dir eine Konversation zugewiesen:\n„${threadSubject || "Kein Betreff"}"${senderEmail ? `\nVon: ${senderEmail}` : ""}\n<https://admin.ephia.de/dashboard/inbox?thread=${threadId}|Zur Konversation>`;

  await sendSlackDm({
    slackUserId,
    email: assigneeEmail,
    text,
    logTag: "gmail/assignments",
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { threadId, assignedTo, threadSubject, senderEmail } = await request.json();

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

  // Send Slack DM to assignee (fire-and-forget, don't block response)
  if (assignedTo !== user.id) {
    const admin = createAdminClient();

    // Assigner name (used in the DM body).
    const { data: assignerProfile } = await supabase
      .from("profiles")
      .select("title, first_name, last_name")
      .eq("id", user.id)
      .single();
    const assignerName = assignerProfile
      ? [assignerProfile.title, assignerProfile.first_name, assignerProfile.last_name].filter(Boolean).join(" ")
      : "Jemand";

    // Prefer profiles.slack_user_id (already stored for most staff)
    // so we can skip the users.lookupByEmail round-trip. Email is
    // pulled as a fallback for legacy accounts that predate the
    // column.
    const { data: assigneeProfile } = await admin
      .from("profiles")
      .select("slack_user_id")
      .eq("id", assignedTo)
      .single();
    const { data: { user: assigneeUser } } = await admin.auth.admin.getUserById(assignedTo);

    notifyAssigneeOnSlack({
      slackUserId: (assigneeProfile?.slack_user_id as string | null) ?? null,
      assigneeEmail: assigneeUser?.email ?? null,
      assignerName,
      threadSubject: threadSubject || "",
      senderEmail: senderEmail || "",
      threadId,
    });
  }

  return NextResponse.json({ ok: true });
}
