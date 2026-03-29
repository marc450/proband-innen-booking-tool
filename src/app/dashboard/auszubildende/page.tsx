import { createAdminClient } from "@/lib/supabase/admin";
import { CourseSessionsOverview } from "./course-sessions-overview";

export const dynamic = "force-dynamic";

export default async function AuszubildendePage() {
  const supabase = createAdminClient();

  const [{ data: templates }, { data: sessions }] = await Promise.all([
    supabase
      .from("course_templates")
      .select("*")
      .not("course_key", "is", null)
      .order("title", { ascending: true }),
    supabase
      .from("course_sessions")
      .select("*")
      .order("date_iso", { ascending: true }),
  ]);

  return (
    <CourseSessionsOverview
      initialTemplates={templates ?? []}
      initialSessions={sessions ?? []}
    />
  );
}
