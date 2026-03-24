export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { AvailableSlot, Course } from "@/lib/types";
import { CoursesOverview } from "./courses-overview";

export default async function BookPage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("course_date", { ascending: true });

  const { data: slots } = await supabase
    .from("available_slots")
    .select("*")
    .gt("remaining_capacity", 0)
    .gt("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  return (
    <CoursesOverview
      courses={(courses as Course[]) || []}
      slots={(slots as AvailableSlot[]) || []}
    />
  );
}
