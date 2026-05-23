export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Task, TaskCourseSessionRef, TaskProfileRef } from "@/lib/types";
import { TasksManager } from "./tasks-manager";

const TASK_SELECT = `
  id, title, description, status, assigned_to, created_by,
  course_session_id, due_date, created_at, updated_at,
  assignee:profiles!tasks_assigned_to_fkey(id, title, first_name, last_name),
  creator:profiles!tasks_created_by_fkey(id, title, first_name, last_name),
  course_session:course_sessions!tasks_course_session_id_fkey(id, date_iso, label_de, instructor_name)
`;

export default async function TasksPage() {
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

  // Nutzer only see tasks assigned to them. Admin sees everything.
  let tasksQuery = admin
    .from("tasks")
    .select(TASK_SELECT)
    .order("created_at", { ascending: false });
  if (role === "nutzer") {
    tasksQuery = tasksQuery.eq("assigned_to", user.id);
  }

  const [{ data: tasksData }, { data: staffData }, { data: sessionsData }] =
    await Promise.all([
      tasksQuery,
      admin
        .from("profiles")
        .select("id, title, first_name, last_name")
        .in("role", ["admin", "nutzer"])
        .order("last_name", { ascending: true }),
      admin
        .from("course_sessions")
        .select("id, date_iso, label_de, instructor_name")
        .order("date_iso", { ascending: false }),
    ]);

  const tasks = (tasksData ?? []) as unknown as Task[];
  const staff = (staffData ?? []) as TaskProfileRef[];
  const sessions = (sessionsData ?? []) as TaskCourseSessionRef[];

  return (
    <TasksManager
      initialTasks={tasks}
      staff={staff}
      courseSessions={sessions}
      currentUserId={user.id}
      role={role}
    />
  );
}
