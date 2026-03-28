export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { CourseTemplate, Dozent } from "@/lib/types";
import { SettingsContent } from "./settings-content";

export interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "admin" | "dozent";
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

  // Dozent:innen cannot access settings
  if (profile && profile.role !== "admin") {
    redirect("/dashboard");
  }

  const [templatesRes, dozentenRes] = await Promise.all([
    supabase
      .from("course_templates")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("dozenten")
      .select("*")
      .order("last_name", { ascending: true }),
  ]);

  const adminClient = createAdminClient();
  const {
    data: { users: authUsers },
  } = await adminClient.auth.admin.listUsers();

  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, first_name, last_name, role");

  const profileMap = new Map(
    (profiles || []).map(
      (p: { id: string; first_name: string | null; last_name: string | null; role: string }) => [p.id, p]
    )
  );

  const users: AdminUser[] = authUsers.map((u) => ({
    id: u.id,
    email: u.email || "",
    first_name: profileMap.get(u.id)?.first_name ?? null,
    last_name: profileMap.get(u.id)?.last_name ?? null,
    role: (profileMap.get(u.id)?.role ?? "admin") as "admin" | "dozent",
    created_at: u.created_at,
  }));

  return (
    <SettingsContent
      initialTemplates={(templatesRes.data as CourseTemplate[]) || []}
      initialDozenten={(dozentenRes.data as Dozent[]) || []}
      initialUsers={users}
      currentUserId={user.id}
    />
  );
}
