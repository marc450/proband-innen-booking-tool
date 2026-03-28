export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { CourseTemplate, Dozent } from "@/lib/types";
import { TemplatesManager } from "../templates-manager";

export default async function TemplatesPage() {
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("course_templates")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: dozenten } = await supabase
    .from("dozenten")
    .select("*")
    .order("last_name", { ascending: true });

  return (
    <TemplatesManager
      initialTemplates={(templates as CourseTemplate[]) || []}
      dozenten={(dozenten as Dozent[]) || []}
    />
  );
}
