import { createAdminClient } from "@/lib/supabase/admin";
import { CourseSessionsManager } from "./course-sessions-manager";

export const dynamic = "force-dynamic";

export default async function AuszubildendePage() {
  const supabase = createAdminClient();

  const [{ data: templates }, { data: sessions }, { data: dozentUsers }] = await Promise.all([
    supabase
      .from("course_templates")
      .select("*")
      .not("course_key", "is", null)
      .order("title", { ascending: true }),
    supabase
      .from("course_sessions")
      .select("*")
      .order("date_iso", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, title, first_name, last_name")
      .eq("is_dozent", true)
      .order("last_name", { ascending: true }),
  ]);

  return (
    <CourseSessionsManager
      initialTemplates={templates ?? []}
      initialSessions={sessions ?? []}
      dozentUsers={dozentUsers ?? []}
    />
  );
}
