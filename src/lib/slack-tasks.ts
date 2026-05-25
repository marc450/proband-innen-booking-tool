// Slack notifications for the task system.
//
// Tasks are personal: an assignment goes to exactly one staff member,
// and a status change goes back to exactly one assigner. We used to
// post these to a public #aufgaben channel via an incoming webhook,
// which leaked task content to everyone and required the channel to be
// joined. We now DM the recipient directly via the EPHIA Slack bot.
//
// All transport lives in `slack-dm.ts` (shared with the inbox/thread
// assignment notifier). This module only composes the message strings.

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendSlackDm } from "./slack-dm";

const ADMIN_BASE = "https://admin.ephia.de";

type StaffRow = {
  id: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  slack_user_id: string | null;
  email: string | null;
};

function displayName(p: StaffRow | null | undefined): string {
  if (!p) return "Jemand";
  const parts = [p.title, p.first_name, p.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "Unbekannt";
}

async function fetchStaff(
  admin: SupabaseClient,
  ids: string[],
): Promise<Map<string, StaffRow>> {
  const unique = Array.from(new Set(ids.filter((x): x is string => !!x)));
  if (unique.length === 0) return new Map();
  const { data } = await admin
    .from("profiles")
    .select("id, title, first_name, last_name, slack_user_id")
    .in("id", unique);
  const map = new Map<string, StaffRow>();
  for (const row of data ?? []) {
    map.set(row.id, {
      id: row.id as string,
      title: (row.title as string | null) ?? null,
      first_name: (row.first_name as string | null) ?? null,
      last_name: (row.last_name as string | null) ?? null,
      slack_user_id: (row.slack_user_id as string | null) ?? null,
      email: null,
    });
  }

  // Pull emails from auth.users for anyone missing a Slack ID, so the
  // DM helper can fall back to users.lookupByEmail. Cheap when nobody
  // is missing; entirely skipped when every staff member has their
  // slack_user_id stored.
  const needEmail = unique.filter((id) => !map.get(id)?.slack_user_id);
  if (needEmail.length > 0) {
    for (const id of needEmail) {
      try {
        const { data } = await admin.auth.admin.getUserById(id);
        const email = data.user?.email ?? null;
        const existing = map.get(id);
        if (existing) map.set(id, { ...existing, email });
      } catch {
        // Best-effort: a missing email just means we skip the DM later.
      }
    }
  }

  return map;
}

function taskUrl(taskId: string): string {
  return `${ADMIN_BASE}/dashboard/tasks/${taskId}`;
}

function bullet(label: string, value: string | null | undefined): string | null {
  if (!value) return null;
  return `*${label}:* ${value}`;
}

export type TaskNotifyContext = {
  taskId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  courseLabel: string | null;
};

/**
 * DM the assignee that a task has just been assigned to them. No-ops
 * when the assignee is also the assigner (self-assignment).
 */
export async function notifyTaskAssigned(
  admin: SupabaseClient,
  ctx: TaskNotifyContext,
  assigneeId: string,
  assignerId: string | null,
): Promise<void> {
  if (!assigneeId || assigneeId === assignerId) return;

  const staff = await fetchStaff(
    admin,
    [assigneeId, assignerId].filter((x): x is string => !!x),
  );
  const assignee = staff.get(assigneeId);
  const assigner = assignerId ? staff.get(assignerId) : null;
  if (!assignee) return;

  const lines = [
    `Dir wurde eine neue Aufgabe zugewiesen:`,
    `*${ctx.title}*`,
    bullet("Beschreibung", ctx.description?.trim() || null),
    bullet("Fällig", ctx.dueDate),
    bullet("Kurs", ctx.courseLabel),
    assigner ? `Zugewiesen von ${displayName(assigner)}` : null,
    taskUrl(ctx.taskId),
  ].filter(Boolean);

  await sendSlackDm({
    slackUserId: assignee.slack_user_id,
    email: assignee.email,
    text: lines.join("\n"),
    logTag: "slack-tasks/assigned",
  });
}

/**
 * DM the assigner that the assignee changed a task's status. No-ops
 * when the assigner is the same person who changed it (they moved
 * their own task).
 */
export async function notifyTaskStatusChanged(
  admin: SupabaseClient,
  ctx: TaskNotifyContext,
  newStatus: "open" | "in_progress" | "done",
  assignerId: string | null,
  changerId: string,
): Promise<void> {
  if (!assignerId || assignerId === changerId) return;

  const staff = await fetchStaff(admin, [assignerId, changerId]);
  const assigner = staff.get(assignerId);
  const changer = staff.get(changerId);
  if (!assigner) return;

  const statusLabel: Record<typeof newStatus, string> = {
    open: "Offen",
    in_progress: "In Arbeit",
    done: "Erledigt",
  };

  const lines = [
    `${displayName(changer)} hat den Status einer Aufgabe geändert:`,
    `*${ctx.title}*`,
    `Neuer Status: ${statusLabel[newStatus]}`,
    taskUrl(ctx.taskId),
  ];

  await sendSlackDm({
    slackUserId: assigner.slack_user_id,
    email: assigner.email,
    text: lines.join("\n"),
    logTag: "slack-tasks/status",
  });
}
