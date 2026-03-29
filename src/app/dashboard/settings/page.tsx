export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { CourseTemplate, CourseSession } from "@/lib/types";
import { SettingsContent } from "./settings-content";

export interface AdminUser {
  id: string;
  email: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  role: "admin" | "dozent";
  is_dozent: boolean;
  created_at: string;
}

export default async function SettingsPage() {
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

  if (profile && profile.role !== "admin") redirect("/dashboard");

  const { data: templatesData } = await supabase
    .from("course_templates")
    .select("*")
    .order("created_at", { ascending: false });

  const adminClient = createAdminClient();
  const [{ data: { users: authUsers } }, { data: profiles }] = await Promise.all([
    adminClient.auth.admin.listUsers(),
    adminClient.from("profiles").select("id, title, first_name, last_name, role, is_dozent"),
  ]);

  const profileMap = new Map(
    (profiles || []).map(
      (p: { id: string; title: string | null; first_name: string | null; last_name: string | null; role: string; is_dozent: boolean }) => [p.id, p]
    )
  );

  const users: AdminUser[] = authUsers.map((u) => ({
    id: u.id,
    email: u.email || "",
    title: profileMap.get(u.id)?.title ?? null,
    first_name: profileMap.get(u.id)?.first_name ?? null,
    last_name: profileMap.get(u.id)?.last_name ?? null,
    role: (profileMap.get(u.id)?.role ?? "admin") as "admin" | "dozent",
    is_dozent: profileMap.get(u.id)?.is_dozent ?? false,
    created_at: u.created_at,
  }));

  // Fetch Auszubildende course templates and sessions
  const { data: courseOfferingsData } = await supabase
    .from("course_templates")
    .select("*")
    .not("course_key", "is", null)
    .order("title", { ascending: true });

  const { data: courseSessionsData } = await supabase
    .from("course_sessions")
    .select("*")
    .order("date_iso", { ascending: true });

  return (
    <SettingsContent
      initialTemplates={(templatesData as CourseTemplate[]) || []}
      initialUsers={users}
      currentUserId={user.id}
      initialCourseOfferings={(courseOfferingsData as CourseTemplate[]) || []}
      initialCourseSessions={(courseSessionsData as CourseSession[]) || []}
    />
  );
}
