export const revalidate = 60;

import { createClient } from "@/lib/supabase/server";
import { AvailableSlot, Course } from "@/lib/types";
import { CoursesOverview } from "./courses-overview";

export default async function BookPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "online")
    .gte("course_date", today)
    .order("course_date", { ascending: true });

  const { data: slots } = await supabase
    .from("available_slots")
    .select("*")
    .gt("remaining_capacity", 0)
    .gt("start_time", new Date(Date.now() + 30 * 60 * 1000).toISOString())
    .order("start_time", { ascending: true });

  return (
    <CoursesOverview
      courses={(courses as Course[]) || []}
      slots={(slots as AvailableSlot[]) || []}
    />
  );
}
