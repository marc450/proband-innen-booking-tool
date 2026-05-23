import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyTaskAssigned } from "@/lib/slack-tasks";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const TASK_SELECT = `
  id, title, description, status, assigned_to, created_by, assigned_by,
  course_session_id, due_date, created_at, updated_at,
  assignee:profiles!tasks_assigned_to_fkey(id, title, first_name, last_name),
  creator:profiles!tasks_created_by_fkey(id, title, first_name, last_name),
  course_session:course_sessions!tasks_course_session_id_fkey(id, date_iso, label_de, instructor_name, template:course_templates!course_sessions_template_id_fkey(title))
`;

type StaffRole = "admin" | "nutzer";

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
  template: { title: string } | null;
} | null): string | null {
  if (!s) return null;
  const date = s.date_iso
    ? format(new Date(s.date_iso), "dd.MM.yyyy", { locale: de })
    : "";
  const title = s.template?.title || s.label_de || "Kurstermin";
  return [title, date].filter(Boolean).join(", ") || null;
}

export async function POST(req: NextRequest) {
  const user = await assertStaff();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const title =
    typeof body.title === "string" ? body.title.trim() : "";
  if (!title)
    return NextResponse.json(
      { error: "Bitte einen Titel angeben." },
      { status: 400 },
    );

  const description: string | null =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const courseSessionId: string | null =
    typeof body.course_session_id === "string" && body.course_session_id
      ? body.course_session_id
      : null;
  const dueDate: string | null =
    typeof body.due_date === "string" && body.due_date ? body.due_date : null;

  // Nutzer can only self-assign; admins can assign to anyone (or no one).
  const requestedAssignee: string | null =
    typeof body.assigned_to === "string" && body.assigned_to
      ? body.assigned_to
      : null;
  const assignedTo =
    user.role === "admin" ? requestedAssignee : user.id;

  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("tasks")
    .insert({
      title,
      description,
      assigned_to: assignedTo,
      created_by: user.id,
      assigned_by: assignedTo ? user.id : null,
      course_session_id: courseSessionId,
      due_date: dueDate,
    })
    .select(TASK_SELECT)
    .single();

  if (error || !row)
    return NextResponse.json(
      { error: error?.message || "Konnte Aufgabe nicht anlegen." },
      { status: 500 },
    );

  // Fire-and-forget Slack notification when the assignee is someone else.
  if (assignedTo && assignedTo !== user.id) {
    notifyTaskAssigned(
      admin,
      {
        taskId: row.id,
        title,
        description,
        dueDate,
        courseLabel: sessionLabel(
          (row as unknown as {
            course_session: {
              date_iso: string | null;
              label_de: string | null;
              template: { title: string } | null;
            } | null;
          }).course_session,
        ),
      },
      assignedTo,
      user.id,
    ).catch((e) => console.error("notifyTaskAssigned failed:", e));
  }

  return NextResponse.json({ task: row });
}
