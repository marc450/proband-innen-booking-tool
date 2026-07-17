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
  is_autor: boolean;
  slack_user_id: string | null;
  dozent_employer: string | null;
  dozent_specialization: string | null;
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

  // Only staff (admin / nutzer) belong in this table. Customer accounts
  // created via the LW SSO bridge get role='student' and must be excluded.
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, title, first_name, last_name, role, is_dozent, is_kursbetreuung, is_autor, slack_user_id, dozent_employer, dozent_specialization")
    .in("role", ["admin", "nutzer"]);

  // Fetch each staff auth row by id. listUsers() is paginated (50/page
  // default, 1000 max), so after the LW SSO migration added many
  // 'student' auth rows the staff ids no longer fit on the first page.
  const authRecords = await Promise.all(
    (profiles ?? []).map((p: any) => adminClient.auth.admin.getUserById(p.id))
  );
  const authMap = new Map(
    authRecords
      .map((r) => r.data?.user)
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((u) => [u.id, u])
  );

  const users: AdminUser[] = (profiles || [])
    .map((p: any) => {
      const auth = authMap.get(p.id);
      if (!auth) return null;
      return {
        id: p.id,
        email: auth.email || "",
        title: p.title ?? null,
        first_name: p.first_name ?? null,
        last_name: p.last_name ?? null,
        role: p.role as "admin" | "nutzer",
        is_dozent: p.is_dozent ?? false,
        is_kursbetreuung: p.is_kursbetreuung ?? false,
        is_autor: p.is_autor ?? false,
        slack_user_id: p.slack_user_id ?? null,
        dozent_employer: p.dozent_employer ?? null,
        dozent_specialization: p.dozent_specialization ?? null,
        created_at: auth.created_at,
      };
    })
    .filter((u: AdminUser | null): u is AdminUser => u !== null);

  // Fetch all course templates
  const { data: courseOfferingsData } = await supabase
    .from("course_templates")
    .select("*")
    .order("title", { ascending: true });

  const { data: courseSessionsData } = await supabase
    .from("course_sessions")
    .select("*")
    .order("date_iso", { ascending: true });

  // Proband:innen satellite status per session. The satellite is the
  // `courses` row the Patient:innen funnel reads against; its status
  // (published/draft) is what takes the Proband:innen course on- or
  // offline, independent of the session's own is_live flag.
  const sessionIds = ((courseSessionsData ?? []) as CourseSession[]).map((s) => s.id);
  const { data: satelliteData } = sessionIds.length
    ? await adminClient
        .from("courses")
        .select("session_id, status")
        .in("session_id", sessionIds)
    : { data: [] as Array<{ session_id: string; status: string | null }> };
  const probandStatuses: Record<string, string> = {};
  for (const row of satelliteData ?? []) {
    if (row.session_id) probandStatuses[row.session_id] = row.status ?? "draft";
  }

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
    .from("v_auszubildende")
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
      probandStatuses={probandStatuses}
    />
  );
}
