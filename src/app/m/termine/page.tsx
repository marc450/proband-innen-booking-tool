export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { CoursesOverview } from "./courses-overview";

export default async function MobileTerminePage() {
  const supabase = await createClient();

  const [{ data: courses }, { data: slots }, { data: bookingCounts }] =
    await Promise.all([
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
    />
  );
}
