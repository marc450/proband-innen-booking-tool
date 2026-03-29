import { createAdminClient } from "@/lib/supabase/admin";
import { CourseSessionsManager } from "./course-sessions-manager";

export const dynamic = "force-dynamic";

export default async function AuszubildendePage() {
  const supabase = createAdminClient();

  const { data: templates } = await supabase
    .from("course_templates")
    .select("*")
    .not("course_key", "is", null)
    .order("title", { ascending: true });

  const { data: sessions } = await supabase
    .from("course_sessions")
    .select("*")
    .order("date_iso", { ascending: true });

  return (
    <CourseSessionsManager
      initialTemplates={templates ?? []}
      initialSessions={sessions ?? []}
    />
  );
}
