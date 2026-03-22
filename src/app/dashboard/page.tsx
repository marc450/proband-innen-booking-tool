export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { Course, Slot } from "@/lib/types";
import { CoursesManager } from "./courses-manager";

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

  return (
    <CoursesManager
      initialCourses={(courses as Course[]) || []}
      initialSlots={(slots as Slot[]) || []}
    />
  );
}
