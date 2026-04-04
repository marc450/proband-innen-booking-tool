import { createAdminClient } from "@/lib/supabase/admin";
import { CURRICULUM_BOTULINUM } from "@/lib/curricula";
import { CurriculumPage } from "./curriculum-page";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CurriculumBotulinumPage() {
  const supabase = createAdminClient();
  const curriculum = CURRICULUM_BOTULINUM;
  const courseKeys = curriculum.courses.map((c) => c.courseKey);

  // Fetch all templates
  const { data: templates } = await supabase
    .from("course_templates")
    .select("*")
    .in("course_key", courseKeys)
    .eq("status", "live");

  if (!templates || templates.length === 0) return notFound();

  // Sort templates by curriculum order
  const sortedTemplates = courseKeys
    .map((key) => templates.find((t: { course_key: string }) => t.course_key === key))
    .filter(Boolean);

  // Fetch live sessions for all templates
  const templateIds = sortedTemplates.map((t: { id: string }) => t.id);
  const { data: allSessions } = await supabase
    .from("course_sessions")
    .select("*")
    .in("template_id", templateIds)
    .eq("is_live", true)
    .order("date_iso", { ascending: true });

  return (
    <CurriculumPage
      curriculum={curriculum}
      templates={sortedTemplates}
      sessions={allSessions ?? []}
    />
  );
}
