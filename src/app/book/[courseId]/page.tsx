export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { AvailableSlot, Course } from "@/lib/types";
import { SlotSelection } from "./slot-selection";
import { notFound } from "next/navigation";

export default async function CourseBookingPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();

  // Fetch the requested course
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (!course) {
    notFound();
  }

  // Fetch all sibling courses with the same title (different dates)
  const { data: siblingCourses } = await supabase
    .from("courses")
    .select("*")
    .eq("title", course.title)
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
    <SlotSelection
      course={course as Course}
      allCourses={allCourses}
      slots={(slots as AvailableSlot[]) || []}
    />
  );
}
