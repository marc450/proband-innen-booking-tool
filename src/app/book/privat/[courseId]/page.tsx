export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { AvailableSlot, Course } from "@/lib/types";
import { PrivatSlotSelection } from "./slot-selection";
import { notFound } from "next/navigation";
import { INDICATIONS, IndicationKey } from "@/lib/indications";

export default async function PrivatCourseBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ indication?: string }>;
}) {
  const { courseId } = await params;
  const { indication } = await searchParams;
  // Deep-link entry point: the standalone Masseter card on the private
  // overview links to /book/privat/{therapCourseId}?indication=masseter so the
  // referral skips the indication picker. Only accept a real IndicationKey;
  // anything else is ignored and the normal flow runs.
  const initialIndication: IndicationKey | null =
    INDICATIONS.some((i) => i.key === indication)
      ? (indication as IndicationKey)
      : null;
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

  // Fetch available slots for all sibling courses. Filter on
  // general_remaining so masseter-reserved seats (held for
  // Masseterproband:innen on Grundkurs Botulinum courses) never show up
  // as general availability. On non-eligible slots general_remaining
  // equals remaining_capacity, so cosmetic courses are unaffected.
  const courseIds = allCourses.map((c) => c.id);
  const { data: slots } = await supabase
    .from("available_slots")
    .select("*")
    .in("course_id", courseIds)
    .gt("general_remaining", 0)
    .gt("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  // When this is the Therap. Indikationen course, the masseter indication
  // may also be booked into a reserved masseter seat in a Grundkurs
  // Botulinum course. masseter_eligible is only set on Botulinum courses.
  const usesIndications = /therap.*indikation/i.test(course.title);

  let masseterSlots: AvailableSlot[] = [];
  let masseterCourses: Course[] = [];
  if (usesIndications) {
    const { data: mSlots } = await supabase
      .from("available_slots")
      .select("*")
      .eq("masseter_eligible", true)
      .gt("masseter_remaining", 0)
      .gt("start_time", new Date().toISOString())
      .gte("course_date", today)
      .order("start_time", { ascending: true });
    masseterSlots = (mSlots as AvailableSlot[]) || [];

    const masseterCourseIds = Array.from(new Set(masseterSlots.map((s) => s.course_id)));
    if (masseterCourseIds.length > 0) {
      const { data: mCourses } = await supabase
        .from("courses")
        .select("*, instructor:profiles!instructor_id(title, first_name, last_name)")
        .in("id", masseterCourseIds);
      masseterCourses = (mCourses as Course[]) || [];
    }
  }

  // Earliest slot per course across ALL slots (incl. booked-out). The
  // "Behandlung durch Dozent:in" pill must mark the absolute first slot
  // of the day, not just the first one still available.
  const allCourseIds = Array.from(
    new Set([...courseIds, ...masseterCourses.map((c) => c.id)]),
  );
  const { data: allSlots } = await supabase
    .from("slots")
    .select("course_id, start_time")
    .in("course_id", allCourseIds)
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
      masseterSlots={masseterSlots}
      masseterCourses={masseterCourses}
      firstSlotByCourse={firstSlotByCourse}
      initialIndication={usesIndications ? initialIndication : null}
    />
  );
}
