export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { CampaignsManager } from "./campaigns-manager";

export default async function CampaignsPage() {
  if (!(await isAdmin())) redirect("/dashboard");
  const supabase = await createClient();

  const { data: campaigns } = await supabase
    .from("email_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  return <CampaignsManager campaigns={campaigns || []} />;
}
