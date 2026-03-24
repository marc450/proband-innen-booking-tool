export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { decryptPatient } from "@/lib/encryption";
import { CampaignComposer } from "./campaign-composer";

export default async function NewCampaignPage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, course_date, location")
    .order("course_date", { ascending: false });

  const { data: patients } = await supabase
    .from("patients")
    .select("*")
    .order("created_at");

  const decrypted = (patients || []).map(decryptPatient);

  return (
    <CampaignComposer
      courses={courses || []}
      patients={decrypted.map((p) => ({
        id: p.id,
        email: p.email,
        first_name: p.first_name,
        last_name: p.last_name,
        patient_status: p.patient_status,
      }))}
    />
  );
}
