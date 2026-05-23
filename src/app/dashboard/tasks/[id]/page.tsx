export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Task,
  TaskAttachment,
  TaskCourseSessionRef,
  TaskNote,
  TaskProfileRef,
} from "@/lib/types";
import { TaskDetail } from "./task-detail";

const TASK_SELECT = `
  id, title, description, status, assigned_to, created_by,
  course_session_id, due_date, created_at, updated_at,
  assignee:profiles!tasks_assigned_to_fkey(id, title, first_name, last_name),
  creator:profiles!tasks_created_by_fkey(id, title, first_name, last_name),
  course_session:course_sessions!tasks_course_session_id_fkey(id, date_iso, label_de, instructor_name, template:course_templates!course_sessions_template_id_fkey(title))
`;

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || (profile.role !== "admin" && profile.role !== "nutzer")) {
    redirect("/dashboard");
  }
  const role = profile.role as "admin" | "nutzer";

  const admin = createAdminClient();

  const [{ data: taskData }, { data: staffData }, { data: sessionsData }] =
    await Promise.all([
      admin.from("tasks").select(TASK_SELECT).eq("id", id).maybeSingle(),
      admin
        .from("profiles")
        .select("id, title, first_name, last_name")
        .in("role", ["admin", "nutzer"])
        .order("last_name", { ascending: true }),
      admin
        .from("course_sessions")
        .select("id, date_iso, label_de, instructor_name, template:course_templates!course_sessions_template_id_fkey(title)")
        .order("date_iso", { ascending: false }),
    ]);

  if (!taskData) notFound();

  // Nutzer can only open tasks assigned to them.
  const task = taskData as unknown as Task;
  if (role === "nutzer" && task.assigned_to !== user.id) {
    redirect("/dashboard/tasks");
  }

  const [{ data: notesData }, { data: attachmentsData }] = await Promise.all([
    admin
      .from("task_notes")
      .select(
        "id, task_id, author_id, body, created_at, author:profiles!task_notes_author_id_fkey(id, title, first_name, last_name)",
      )
      .eq("task_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("task_attachments")
      .select(
        "id, task_id, uploaded_by, file_name, file_size, mime_type, storage_path, created_at, uploader:profiles!task_attachments_uploaded_by_fkey(id, title, first_name, last_name)",
      )
      .eq("task_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <TaskDetail
      initialTask={task}
      initialNotes={(notesData ?? []) as unknown as TaskNote[]}
      initialAttachments={(attachmentsData ?? []) as unknown as TaskAttachment[]}
      staff={(staffData ?? []) as TaskProfileRef[]}
      courseSessions={(sessionsData ?? []) as unknown as TaskCourseSessionRef[]}
      currentUserId={user.id}
      role={role}
    />
  );
}
