import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  notifyTaskAssigned,
  notifyTaskStatusChanged,
} from "@/lib/slack-tasks";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const TASK_SELECT = `
  id, title, description, status, assigned_to, created_by, assigned_by,
  course_session_id, due_date, created_at, updated_at,
  assignee:profiles!tasks_assigned_to_fkey(id, title, first_name, last_name),
  creator:profiles!tasks_created_by_fkey(id, title, first_name, last_name),
  course_session:course_sessions!tasks_course_session_id_fkey(id, date_iso, label_de, instructor_name)
`;

type StaffRole = "admin" | "nutzer";
type TaskStatus = "open" | "in_progress" | "done";

async function assertStaff(): Promise<
  { id: string; role: StaffRole } | null
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role === "admin" || profile?.role === "nutzer") {
    return { id: user.id, role: profile.role as StaffRole };
  }
  return null;
}

function sessionLabel(s: {
  date_iso: string | null;
  label_de: string | null;
} | null): string | null {
  if (!s) return null;
  const date = s.date_iso
    ? format(new Date(s.date_iso), "dd.MM.yyyy", { locale: de })
    : "";
  const base = s.label_de || "Kurstermin";
  return [date, base].filter(Boolean).join(", ") || null;
}

type CurrentTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  assigned_by: string | null;
  course_session_id: string | null;
  due_date: string | null;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await assertStaff();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const admin = createAdminClient();

  const { data: current, error: loadErr } = await admin
    .from("tasks")
    .select(
      "id, title, description, status, assigned_to, assigned_by, course_session_id, due_date",
    )
    .eq("id", id)
    .maybeSingle<CurrentTask>();

  if (loadErr)
    return NextResponse.json({ error: loadErr.message }, { status: 500 });
  if (!current)
    return NextResponse.json(
      { error: "Aufgabe nicht gefunden." },
      { status: 404 },
    );

  if (user.role === "nutzer" && current.assigned_to !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t)
      return NextResponse.json(
        { error: "Titel darf nicht leer sein." },
        { status: 400 },
      );
    patch.title = t;
  }
  if ("description" in body) {
    patch.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
  }
  if ("due_date" in body) {
    patch.due_date =
      typeof body.due_date === "string" && body.due_date ? body.due_date : null;
  }
  if ("course_session_id" in body) {
    patch.course_session_id =
      typeof body.course_session_id === "string" && body.course_session_id
        ? body.course_session_id
        : null;
  }
  if ("status" in body) {
    const s = body.status as TaskStatus;
    if (s !== "open" && s !== "in_progress" && s !== "done") {
      return NextResponse.json({ error: "Ungültiger Status." }, { status: 400 });
    }
    patch.status = s;
  }
  if ("assigned_to" in body) {
    const next: string | null =
      typeof body.assigned_to === "string" && body.assigned_to
        ? body.assigned_to
        : null;
    if (user.role === "nutzer" && next !== user.id) {
      // Nutzer can't reassign away (would also lose visibility under RLS).
      return NextResponse.json(
        { error: "Nur Admins können Aufgaben neu zuweisen." },
        { status: 403 },
      );
    }
    patch.assigned_to = next;
    // Track who set the current assignee so status-change notifications
    // can route back to the right person. Cleared when unassigning.
    patch.assigned_by = next ? user.id : null;
  }

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "Nichts zu ändern." }, { status: 400 });

  const { data: updated, error: updErr } = await admin
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select(TASK_SELECT)
    .single();
  if (updErr || !updated)
    return NextResponse.json(
      { error: updErr?.message || "Update fehlgeschlagen." },
      { status: 500 },
    );

  // Notifications
  const notifications: Promise<void>[] = [];

  const courseLabel = sessionLabel(
    (updated as unknown as {
      course_session: {
        date_iso: string | null;
        label_de: string | null;
      } | null;
    }).course_session,
  );

  const updatedTyped = updated as unknown as CurrentTask;
  const notifyCtx = {
    taskId: updatedTyped.id,
    title: updatedTyped.title,
    description: updatedTyped.description,
    dueDate: updatedTyped.due_date,
    courseLabel,
  };

  if (
    "assigned_to" in patch &&
    patch.assigned_to &&
    patch.assigned_to !== current.assigned_to
  ) {
    notifications.push(
      notifyTaskAssigned(
        admin,
        notifyCtx,
        patch.assigned_to as string,
        user.id,
      ),
    );
  }

  if (
    "status" in patch &&
    patch.status !== current.status &&
    current.assigned_by &&
    current.assigned_to === user.id
  ) {
    notifications.push(
      notifyTaskStatusChanged(
        admin,
        notifyCtx,
        patch.status as TaskStatus,
        current.assigned_by,
        user.id,
      ),
    );
  }

  Promise.all(notifications).catch((e) =>
    console.error("task notifications failed:", e),
  );

  return NextResponse.json({ task: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await assertStaff();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  if (user.role === "nutzer") {
    const { data: row } = await admin
      .from("tasks")
      .select("assigned_to")
      .eq("id", id)
      .maybeSingle();
    if (!row)
      return NextResponse.json(
        { error: "Aufgabe nicht gefunden." },
        { status: 404 },
      );
    if (row.assigned_to !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await admin.from("tasks").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
