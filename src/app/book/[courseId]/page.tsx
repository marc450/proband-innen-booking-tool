export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { AvailableSlot, Course } from "@/lib/types";
import { SlotSelection } from "./slot-selection";
import { notFound } from "next/navigation";
import { probandHorizonIso, probandTodayIso } from "@/lib/proband-visibility";
import { INDICATIONS, IndicationKey } from "@/lib/indications";

export default async function CourseBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ indication?: string }>;
}) {
  const { courseId } = await params;
  const { indication } = await searchParams;
  // Deep-link entry point: the standalone Masseter card on the overview
  // links to /book/{therapCourseId}?indication=masseter so the proband
  // skips the indication picker. Only accept a value that is a real
  // IndicationKey; anything else is ignored and the normal flow runs.
  const initialIndication: IndicationKey | null =
    INDICATIONS.some((i) => i.key === indication)
      ? (indication as IndicationKey)
      : null;
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
    .lte("course_date", horizon)
    .order("start_time", { ascending: true });

  // When this is the Therap. Indikationen course, a proband who picks the
  // masseter indication may also book a reserved masseter seat in a
  // Grundkurs Botulinum course. Those seats live on masseter_eligible
  // slots and are surfaced here so the masseter date list can merge them
  // in. masseter_eligible is only ever set on Botulinum courses, so no
  // title filter is needed.
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
      .lte("course_date", horizon)
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
    <SlotSelection
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
