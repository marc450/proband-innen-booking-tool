import { createAdminClient } from "@/lib/supabase/admin";
import { CourseSessionsOverview } from "./course-sessions-overview";

export const dynamic = "force-dynamic";

export default async function AuszubildendePage() {
  const supabase = createAdminClient();

  const [{ data: templates }, { data: sessions }, { data: dentistBookings }] = await Promise.all([
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
      .from("course_bookings")
      .select("session_id")
      .eq("audience_tag", "Zahnmediziner:in")
      .not("session_id", "is", null),
  ]);

  const dentistSessionIds = new Set(
    (dentistBookings ?? []).map((b) => b.session_id).filter(Boolean)
  );

  return (
    <CourseSessionsOverview
      initialTemplates={templates ?? []}
      initialSessions={sessions ?? []}
      dentistSessionIds={Array.from(dentistSessionIds)}
    />
  );
}
