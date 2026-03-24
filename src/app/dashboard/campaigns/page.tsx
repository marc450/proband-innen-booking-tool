export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { CampaignsManager } from "./campaigns-manager";

export default async function CampaignsPage() {
  const supabase = await createClient();

  const { data: campaigns } = await supabase
    .from("email_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  return (
    <CampaignsManager
      campaigns={campaigns || []}
      courses={courses || []}
    />
  );
}
