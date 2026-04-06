import { createClient } from "@/lib/supabase/server";
import { decryptPatient } from "@/lib/encryption";
import { ContactsList } from "./contacts-list";

export const dynamic = "force-dynamic";

export default async function MobileContactsPage() {
  const supabase = await createClient();

  const { data: patients } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });

  const decrypted = (patients || []).map(decryptPatient);

  return <ContactsList patients={decrypted} />;
}
