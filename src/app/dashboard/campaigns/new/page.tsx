export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptPatient } from "@/lib/encryption";
import { CampaignComposer } from "./campaign-composer";

export default async function NewCampaignPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const [{ data: patients }, { data: auszubildende }] = await Promise.all([
    supabase.from("patients").select("*").order("created_at"),
    adminSupabase
      .from("auszubildende")
      .select("id, email, first_name, last_name, status, contact_type")
      .order("last_name", { ascending: true }),
  ]);

  const decrypted = (patients || []).map(decryptPatient);

  // Only Auszubildende (not "other"/"company") and drop anyone who has
  // explicitly opted out (status "inactive") so the composer UI matches
  // what the send pipeline actually mails.
  const filteredAzubis = (auszubildende || []).filter((a) => {
    const ct = a.contact_type as string | null;
    const isAzubi = ct === "auszubildende" || ct == null;
    return isAzubi && a.status !== "inactive";
  });

  const sendablePatients = decrypted.filter((p) => p.patient_status !== "inactive");

  return (
    <CampaignComposer
      patients={sendablePatients.map((p) => ({
        id: p.id,
        email: p.email,
        first_name: p.first_name,
        last_name: p.last_name,
        patient_status: p.patient_status,
      }))}
      auszubildende={filteredAzubis.map((a) => ({
        id: a.id,
        email: a.email,
        first_name: a.first_name,
        last_name: a.last_name,
      }))}
    />
  );
}
