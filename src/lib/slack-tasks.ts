// Slack notifications for the task system.
//
// We post to a channel webhook (no bot token available on this Slack
// workspace tier) and rely on `<@USER_ID>` syntax to ping the relevant
// person. If a staff member has no slack_user_id stored, the message
// still goes out but uses their display name without a ping.
//
// Set SLACK_WEBHOOK_URL_TASKS for a dedicated #aufgaben channel. If
// unset, we fall back to the generic SLACK_WEBHOOK_URL (the
// #proband-innen booking channel), which works but is noisier.

import type { SupabaseClient } from "@supabase/supabase-js";

const TASKS_URL =
  process.env.SLACK_WEBHOOK_URL_TASKS || process.env.SLACK_WEBHOOK_URL;

const ADMIN_BASE = "https://admin.ephia.de";

type StaffRow = {
  id: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  slack_user_id: string | null;
};

function displayName(p: StaffRow | null | undefined): string {
  if (!p) return "Jemand";
  const parts = [p.title, p.first_name, p.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "Unbekannt";
}

function mention(p: StaffRow | null | undefined): string {
  if (!p) return "Jemand";
  if (p.slack_user_id) return `<@${p.slack_user_id}>`;
  return displayName(p);
}

async function postToSlack(text: string): Promise<void> {
  if (!TASKS_URL) {
    console.warn("[slack-tasks] No webhook URL configured; skipping.");
    return;
  }
  try {
    const res = await fetch(TASKS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      console.error(
        "[slack-tasks] Webhook returned",
        res.status,
        await res.text().catch(() => ""),
      );
    }
  } catch (err) {
    console.error("[slack-tasks] Webhook fetch failed:", err);
  }
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
  for (const row of data ?? []) map.set(row.id, row as StaffRow);
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
 * Notify the assignee that a task has been created or reassigned to them.
 * No-ops if assignee === assigner (self-assigned).
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

  const lines = [
    `${mention(assignee)}, Dir wurde eine neue Aufgabe zugewiesen:`,
    `*${ctx.title}*`,
    bullet("Beschreibung", ctx.description?.trim() || null),
    bullet("Fällig", ctx.dueDate),
    bullet("Kurs", ctx.courseLabel),
    assigner ? `Zugewiesen von ${displayName(assigner)}` : null,
    taskUrl(ctx.taskId),
  ].filter(Boolean);

  await postToSlack(lines.join("\n"));
}

/**
 * Notify the assigner that the assignee changed a task's status.
 * No-ops if assigner === changer (the assigner moved their own task).
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

  const statusLabel: Record<typeof newStatus, string> = {
    open: "Offen",
    in_progress: "In Arbeit",
    done: "Erledigt",
  };

  const lines = [
    `${mention(assigner)}, ${displayName(changer)} hat den Status einer Aufgabe geändert:`,
    `*${ctx.title}*`,
    `Neuer Status: ${statusLabel[newStatus]}`,
    taskUrl(ctx.taskId),
  ];

  await postToSlack(lines.join("\n"));
}
