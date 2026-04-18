export const revalidate = 60;

import { createClient } from "@/lib/supabase/server";
import { AvailableSlot, Course } from "@/lib/types";
import { PrivatCoursesOverview } from "./courses-overview";

export default async function PrivatBookPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: courses }, { data: slots }, { data: templates }] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .eq("status", "online")
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

  return (
    <PrivatCoursesOverview
      courses={resolvedCourses}
      slots={(slots as AvailableSlot[]) || []}
    />
  );
}
