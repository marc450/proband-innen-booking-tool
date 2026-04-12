import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

// ---------------------------------------------------------------------------
// Slack DM helper — looks up assignee by email, sends a direct message
// ---------------------------------------------------------------------------
async function notifyAssigneeOnSlack(
  assigneeEmail: string,
  assignerName: string,
  threadSubject: string,
  senderEmail: string,
) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return;

  try {
    // 1. Look up Slack user by email
    const lookupRes = await fetch(
      `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(assigneeEmail)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const lookupData = await lookupRes.json();
    if (!lookupData.ok || !lookupData.user?.id) return;

    const slackUserId = lookupData.user.id;

    // 2. Send DM (using user ID as channel works with chat:write)
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: slackUserId,
        text: `📩 *${assignerName}* hat Dir eine Konversation zugewiesen:\n„${threadSubject || "Kein Betreff"}"${senderEmail ? `\nVon: ${senderEmail}` : ""}`,
      }),
    });
  } catch {
    // Slack notification is best-effort, never block the response
  }
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

    // Get assigner name
    const { data: assignerProfile } = await supabase
      .from("profiles")
      .select("title, first_name, last_name")
      .eq("id", user.id)
      .single();
    const assignerName = assignerProfile
      ? [assignerProfile.title, assignerProfile.first_name, assignerProfile.last_name].filter(Boolean).join(" ")
      : "Jemand";

    // Get assignee email from auth.users (requires admin client)
    const { data: { user: assigneeUser } } = await admin.auth.admin.getUserById(assignedTo);
    if (assigneeUser?.email) {
      notifyAssigneeOnSlack(assigneeUser.email, assignerName, threadSubject || "", senderEmail || "");
    }
  }

  return NextResponse.json({ ok: true });
}
