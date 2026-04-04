export const revalidate = 60;

import { createClient } from "@/lib/supabase/server";
import { AvailableSlot, Course } from "@/lib/types";
import { PrivatCoursesOverview } from "./courses-overview";

export default async function PrivatBookPage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "online")
    .order("course_date", { ascending: true });

  const { data: slots } = await supabase
    .from("available_slots")
    .select("*")
    .gt("remaining_capacity", 0)
    .gt("start_time", new Date(Date.now() + 30 * 60 * 1000).toISOString())
    .order("start_time", { ascending: true });

  return (
    <PrivatCoursesOverview
      courses={(courses as Course[]) || []}
      slots={(slots as AvailableSlot[]) || []}
    />
  );
}
