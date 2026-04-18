import { createAdminClient } from "@/lib/supabase/admin";
import { CourseSessionsOverview } from "./course-sessions-overview";

export const dynamic = "force-dynamic";

export default async function AuszubildendePage() {
  const supabase = createAdminClient();

  const [{ data: templates }, { data: sessions }, { data: zahnBookings }] = await Promise.all([
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
      .neq("status", "cancelled"),
  ]);

  // Per-session Zahnmediziner:innen count. Matches the logic used in
  // /dashboard/settings so both overviews agree.
  const zahnmedizinerCounts: Record<string, number> = {};
  for (const row of zahnBookings ?? []) {
    if (row.session_id) {
      zahnmedizinerCounts[row.session_id] = (zahnmedizinerCounts[row.session_id] ?? 0) + 1;
    }
  }

  return (
    <CourseSessionsOverview
      initialTemplates={templates ?? []}
      initialSessions={sessions ?? []}
      zahnmedizinerCounts={zahnmedizinerCounts}
    />
  );
}
