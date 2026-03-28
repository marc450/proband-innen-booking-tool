export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { Dozent } from "@/lib/types";
import { DozentenManager } from "./dozenten-manager";

export default async function DozentenPage() {
  const supabase = await createClient();

  const { data: dozenten } = await supabase
    .from("dozenten")
    .select("*")
    .order("last_name", { ascending: true });

  return (
    <DozentenManager initialDozenten={(dozenten as Dozent[]) || []} />
  );
}
