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
    .select("*, instructor:profiles!instructor_id(title, first_name, last_name)")
    .eq("id", courseId)
    .single();

  // Private (referral) funnel: only the past-date check applies. The
  // 2-month upper bound is intentionally NOT enforced here so doctors
  // can schedule patients further out. The public funnel still has
  // the upper bound — see /book/[courseId]/page.tsx.
  const today = new Date().toISOString().slice(0, 10);
  if (!course || (course.course_date && course.course_date < today)) {
    notFound();
  }

  // Fetch all sibling courses with the same title, all future dates.
  const { data: siblingCourses } = await supabase
    .from("courses")
    .select("*, instructor:profiles!instructor_id(title, first_name, last_name)")
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
    <PrivatSlotSelection
      course={course as Course}
      allCourses={allCourses}
      slots={(slots as AvailableSlot[]) || []}
      firstSlotByCourse={firstSlotByCourse}
    />
  );
}
