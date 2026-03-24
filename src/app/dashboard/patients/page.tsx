import { createClient } from "@/lib/supabase/server";
import { decryptPatient } from "@/lib/encryption";
import { PatientsManager } from "./patients-manager";

export default async function PatientsPage() {
  const supabase = await createClient();

  const { data: patients } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });

  const decrypted = (patients || []).map(decryptPatient);

  return <PatientsManager initialPatients={decrypted} />;
}
