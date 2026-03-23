export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { Course, Slot } from "@/lib/types";
import { CoursesManager, SlotBooking } from "./courses-manager";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: slots } = await supabase
    .from("slots")
    .select("*")
    .order("start_time", { ascending: true });

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, slot_id, name, first_name, last_name, status, patient_id")
    .neq("status", "cancelled");

  return (
    <CoursesManager
      initialCourses={(courses as Course[]) || []}
      initialSlots={(slots as Slot[]) || []}
      initialBookings={(bookings as SlotBooking[]) || []}
    />
  );
}
