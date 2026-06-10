export const revalidate = 60;

import { createClient } from "@/lib/supabase/server";
import { AvailableSlot, Course } from "@/lib/types";
import { PrivatCoursesOverview } from "./courses-overview";

export default async function PrivatBookPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  // The private (referral) funnel is doctor-driven: they book on
  // behalf of a known patient and may want to schedule months ahead.
  // We deliberately do NOT apply the 2-month rolling window here that
  // the public /kurse/werde-proband-in listing uses; only past dates
  // are excluded.

  const [{ data: courses }, { data: slots }, { data: templates }] = await Promise.all([
    supabase
      .from("courses")
      .select("*, instructor:profiles!instructor_id(title, first_name, last_name)")
      .eq("status", "published")
      .gte("course_date", today)
      .order("course_date", { ascending: true }),
    supabase
      .from("available_slots")
      .select("*")
      .gt("remaining_capacity", 0)
      .gt("start_time", new Date(Date.now() + 30 * 60 * 1000).toISOString())
      .order("start_time", { ascending: true }),
    supabase
      .from("course_templates")
      .select("id, image_url_probanden"),
  ]);

  // Apply the Proband:innen-specific hero image (migration 034) when the
  // template has one set. Otherwise fall back to the course's own image.
  const probandenImageByTemplate = new Map<string, string>();
  for (const t of (templates as { id: string; image_url_probanden: string | null }[] | null) ?? []) {
    if (t.image_url_probanden) probandenImageByTemplate.set(t.id, t.image_url_probanden);
  }
  const resolvedCourses = ((courses as Course[]) || []).map((c) => {
    const override = c.template_id ? probandenImageByTemplate.get(c.template_id) : undefined;
    return override ? { ...c, image_url: override } : c;
  });
  const resolvedSlots = (slots as AvailableSlot[]) || [];

  // Standalone Masseter card, mirroring the public funnel
  // (kurse/werde-proband-in/page.tsx). Masseter is not a separate course; its
  // capacity is the two buckets the slot picker merges: general seats on the
  // Therap. Indikationen course + reserved masseter seats on Grundkurs
  // Botulinum courses (masseter_eligible slots, migration 117). The card
  // deep-links into /book/privat/{therapCourseId}?indication=masseter. It is
  // hidden (null) when there is no Therap. course or zero masseter seats.
  const therapCourse = resolvedCourses.find((c) => /therap.*indikation/i.test(c.title));
  const inWindowCourseIds = new Set(resolvedCourses.map((c) => c.id));
  const masseterSeats = therapCourse
    ? resolvedSlots.reduce((n, s) => {
        if (s.course_id === therapCourse.id) return n + s.general_remaining;
        if (s.masseter_eligible && inWindowCourseIds.has(s.course_id)) {
          return n + s.masseter_remaining;
        }
        return n;
      }, 0)
    : 0;
  const masseterCard =
    therapCourse && masseterSeats > 0
      ? {
          courseId: therapCourse.id,
          imageUrl: therapCourse.image_url,
        }
      : null;

  return (
    <PrivatCoursesOverview
      courses={resolvedCourses}
      slots={resolvedSlots}
      masseterCard={masseterCard}
    />
  );
}
