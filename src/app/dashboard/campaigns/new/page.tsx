export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { CampaignComposer } from "./campaign-composer";

export default async function NewCampaignPage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, course_date, location")
    .order("course_date", { ascending: false });

  const { data: patients } = await supabase
    .from("patients")
    .select("id, email, first_name, last_name, patient_status")
    .order("last_name");

  return (
    <CampaignComposer
      courses={courses || []}
      patients={patients || []}
    />
  );
}
