export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CoursesOverview } from "./courses-overview";

export default async function MobileTerminePage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const [
    { data: courses },
    { data: slots },
    { data: bookingCounts },
    { data: templates },
    { data: sessions },
  ] = await Promise.all([
    // Behandlungstermine data
    supabase
      .from("courses")
      .select("*")
      .eq("status", "online")
      .order("course_date", { ascending: true }),
    supabase
      .from("slots")
      .select("*")
      .order("start_time"),
    supabase
      .from("bookings")
      .select("slot_id")
      .in("status", ["booked", "attended"]),
    // Kurstermine data
    adminSupabase
      .from("course_templates")
      .select("*")
      .not("course_key", "is", null)
      .order("title", { ascending: true }),
    adminSupabase
      .from("course_sessions")
      .select("*")
      .order("date_iso", { ascending: true }),
  ]);

  // Count bookings per slot
  const slotBookingCounts: Record<string, number> = {};
  for (const b of bookingCounts || []) {
    slotBookingCounts[b.slot_id] = (slotBookingCounts[b.slot_id] || 0) + 1;
  }

  return (
    <CoursesOverview
      courses={courses || []}
      slots={slots || []}
      slotBookingCounts={slotBookingCounts}
      templates={templates || []}
      sessions={sessions || []}
    />
  );
}
