export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { AvailableSlot, Course } from "@/lib/types";
import { PrivatSlotSelection } from "./slot-selection";
import { notFound } from "next/navigation";
import { probandHorizonIso, probandTodayIso } from "@/lib/proband-visibility";

export default async function PrivatCourseBookingPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*, instructor:profiles!instructor_id(title, first_name, last_name)")
    .eq("id", courseId)
    .single();

  const today = probandTodayIso();
  const horizon = probandHorizonIso();
  // Hard-gate the per-course landing on the same 2-month window the
  // public listing uses. See lib/proband-visibility.ts.
  if (
    !course ||
    (course.course_date && course.course_date < today) ||
    (course.course_date && course.course_date > horizon)
  ) {
    notFound();
  }

  // Fetch all sibling courses with the same title, only those inside
  // the rolling window.
  const { data: siblingCourses } = await supabase
    .from("courses")
    .select("*, instructor:profiles!instructor_id(title, first_name, last_name)")
    .eq("title", course.title)
    .gte("course_date", today)
    .lte("course_date", horizon)
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
    .lte("course_date", horizon)
    .order("start_time", { ascending: true });

  return (
    <PrivatSlotSelection
      course={course as Course}
      allCourses={allCourses}
      slots={(slots as AvailableSlot[]) || []}
    />
  );
}
