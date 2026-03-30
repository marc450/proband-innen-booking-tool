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

  // Some courses share sessions with another template (e.g. Zahnmedizin uses Botulinum sessions)
  const SESSION_SHARING: Record<string, string> = {
    grundkurs_botulinum_zahnmedizin: "grundkurs_botulinum",
  };

  let sessionTemplateId = template.id;
  const sharedKey = SESSION_SHARING[courseKey];
  if (sharedKey) {
    const { data: sharedTemplate } = await supabase
      .from("course_templates")
      .select("id")
      .eq("course_key", sharedKey)
      .single();
    if (sharedTemplate) sessionTemplateId = sharedTemplate.id;
  }

  // Fetch live sessions
  const { data: sessions } = await supabase
    .from("course_sessions")
    .select("*")
    .eq("template_id", sessionTemplateId)
    .eq("is_live", true)
    .order("date_iso", { ascending: true });

  return (
    <CourseCardsPage
      template={template}
      sessions={sessions ?? []}
    />
  );
}
