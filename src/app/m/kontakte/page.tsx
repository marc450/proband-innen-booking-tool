export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptPatient } from "@/lib/encryption";
import { ContactsList } from "./contacts-list";

export default async function MobileContactsPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const [{ data: patients }, { data: auszubildende }] = await Promise.all([
    supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("auszubildende")
      .select("*")
      .order("last_name", { ascending: true }),
  ]);

  const decryptedPatients = (patients || []).map(decryptPatient);

  // Only show actual Auszubildende (not "other"/"company" contacts)
  const filteredAuszubildende = (auszubildende || []).filter((a) => {
    const ct = a.contact_type as string | null;
    return ct === "auszubildende" || ct == null;
  });

  return (
    <ContactsList
      patients={decryptedPatients}
      auszubildende={filteredAuszubildende}
    />
  );
}
