import { createAdminClient } from "@/lib/supabase/admin";
import { CourseCardsPage } from "./course-cards-page";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseKey: string }>;
}) {
  const { courseKey } = await params;
  const supabase = createAdminClient();

  // Fetch course template by course_key
  const { data: template } = await supabase
    .from("course_templates")
    .select("*")
    .eq("course_key", courseKey)
    .eq("status", "live")
    .single();

  if (!template) return notFound();

  // Fetch live sessions for this template
  const { data: sessions } = await supabase
    .from("course_sessions")
    .select("*")
    .eq("template_id", template.id)
    .eq("is_live", true)
    .order("date_iso", { ascending: true });

  return (
    <CourseCardsPage
      template={template}
      sessions={sessions ?? []}
    />
  );
}
