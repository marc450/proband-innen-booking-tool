export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { AvailableSlot, Course } from "@/lib/types";
import { PrivatSlotSelection } from "./slot-selection";
import { notFound } from "next/navigation";

export default async function PrivatCourseBookingPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  const today = new Date().toISOString().slice(0, 10);
  if (!course || (course.course_date && course.course_date < today)) {
    notFound();
  }

  // Fetch all sibling courses with the same title, only future
  const { data: siblingCourses } = await supabase
    .from("courses")
    .select("*")
    .eq("title", course.title)
    .gte("course_date", today)
    .order("course_date", { ascending: true });

  const allCourses = (siblingCourses as Course[]) || [course as Course];

  // Fetch available slots for all sibling courses
  const courseIds = allCourses.map((c) => c.id);
  const { data: slots } = await supabase
    .from("available_slots")
    .select("*")
    .in("course_id", courseIds)
    .gt("remaining_capacity", 0)
    .gt("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  return (
    <PrivatSlotSelection
      course={course as Course}
      allCourses={allCourses}
      slots={(slots as AvailableSlot[]) || []}
    />
  );
}
