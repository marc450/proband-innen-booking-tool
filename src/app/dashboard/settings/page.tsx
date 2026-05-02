export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { CourseTemplate, CourseSession, Auszubildende } from "@/lib/types";
import { SettingsContent } from "./settings-content";

export interface AdminUser {
  id: string;
  email: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  role: "admin" | "nutzer";
  is_dozent: boolean;
  is_kursbetreuung: boolean;
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

  const adminClient = createAdminClient();
  const [{ data: { users: authUsers } }, { data: profiles }] = await Promise.all([
    adminClient.auth.admin.listUsers(),
    adminClient.from("profiles").select("id, title, first_name, last_name, role, is_dozent, is_kursbetreuung"),
  ]);

  const profileMap = new Map(
    (profiles || []).map((p: any) => [p.id, p])
  );

  const users: AdminUser[] = authUsers.map((u) => ({
    id: u.id,
    email: u.email || "",
    title: profileMap.get(u.id)?.title ?? null,
    first_name: profileMap.get(u.id)?.first_name ?? null,
    last_name: profileMap.get(u.id)?.last_name ?? null,
    role: (profileMap.get(u.id)?.role ?? "nutzer") as "admin" | "nutzer",
    is_dozent: profileMap.get(u.id)?.is_dozent ?? false,
    is_kursbetreuung: profileMap.get(u.id)?.is_kursbetreuung ?? false,
    created_at: u.created_at,
  }));

  // Fetch all course templates
  const { data: courseOfferingsData } = await supabase
    .from("course_templates")
    .select("*")
    .order("title", { ascending: true });

  const { data: courseSessionsData } = await supabase
    .from("course_sessions")
    .select("*")
    .order("date_iso", { ascending: true });

  // Count of Zahnmediziner:innen bookings per session (excluding cancelled).
  const { data: zahnBookings } = await adminClient
    .from("course_bookings")
    .select("session_id")
    .eq("audience_tag", "Zahnmediziner:in")
    .neq("status", "cancelled");
  const zahnmedizinerCounts: Record<string, number> = {};
  for (const row of zahnBookings ?? []) {
    if (row.session_id) {
      zahnmedizinerCounts[row.session_id] = (zahnmedizinerCounts[row.session_id] ?? 0) + 1;
    }
  }

  const { data: auszubildendeData } = await adminClient
    .from("auszubildende")
    .select("id, first_name, last_name, email, phone, title")
    .order("last_name", { ascending: true });

  const [{ data: dozentUsersData }, { data: betreuerUsersData }] = await Promise.all([
    adminClient
      .from("profiles")
      .select("id, title, first_name, last_name")
      .eq("is_dozent", true)
      .order("last_name", { ascending: true }),
    adminClient
      .from("profiles")
      .select("id, title, first_name, last_name")
      .eq("is_kursbetreuung", true)
      .order("last_name", { ascending: true }),
  ]);

  return (
    <SettingsContent
      initialUsers={users}
      currentUserId={user.id}
      initialCourseOfferings={(courseOfferingsData as CourseTemplate[]) || []}
      initialCourseSessions={(courseSessionsData as CourseSession[]) || []}
      dozentUsers={dozentUsersData ?? []}
      betreuerUsers={betreuerUsersData ?? []}
      initialAuszubildende={(auszubildendeData ?? []) as Pick<Auszubildende, "id" | "first_name" | "last_name" | "email" | "phone" | "title">[]}
      zahnmedizinerCounts={zahnmedizinerCounts}
    />
  );
}
