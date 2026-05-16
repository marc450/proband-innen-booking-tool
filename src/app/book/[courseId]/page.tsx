export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { AvailableSlot, Course } from "@/lib/types";
import { SlotSelection } from "./slot-selection";
import { notFound } from "next/navigation";
import { probandHorizonIso, probandTodayIso } from "@/lib/proband-visibility";

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
    .select("*, instructor:profiles!instructor_id(title, first_name, last_name)")
    .eq("id", courseId)
    .single();

  const today = probandTodayIso();
  const horizon = probandHorizonIso();
  // Hard-gate the per-course landing on the same 2-month window the
  // public listing uses. Without the upper bound, a patient with a
  // direct link (email, cached tab, leak) can land on a course
  // months out and book it — see lib/proband-visibility.ts.
  if (
    !course ||
    (course.course_date && course.course_date < today) ||
    (course.course_date && course.course_date > horizon)
  ) {
    notFound();
  }

  // Fetch all sibling courses with the same title (different dates), only
  // those inside the rolling window. Slot picker uses this list, so
  // far-future siblings would otherwise sneak in via the picker.
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

  // Earliest slot per course across ALL slots (incl. booked-out). The
  // "Behandlung durch Dozent:in" pill must mark the absolute first slot
  // of the day, not just the first one still available.
  const { data: allSlots } = await supabase
    .from("slots")
    .select("course_id, start_time")
    .in("course_id", courseIds)
    .order("start_time", { ascending: true });

  const firstSlotByCourse: Record<string, string> = {};
  for (const s of (allSlots as { course_id: string; start_time: string }[]) || []) {
    if (!firstSlotByCourse[s.course_id]) {
      firstSlotByCourse[s.course_id] = s.start_time;
    }
  }

  return (
    <SlotSelection
      course={course as Course}
      allCourses={allCourses}
      slots={(slots as AvailableSlot[]) || []}
      firstSlotByCourse={firstSlotByCourse}
    />
  );
}
