import { createClient } from "@/lib/supabase/server";
import { PatientsManager } from "./patients-manager";

export default async function PatientsPage() {
  const supabase = await createClient();

  const { data: patients } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });

  return <PatientsManager initialPatients={patients || []} />;
}
