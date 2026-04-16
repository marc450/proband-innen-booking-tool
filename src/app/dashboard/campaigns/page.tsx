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

  // Sum recipient_count of campaigns sent within the current calendar month.
  // This is a lower bound: it doesn't include transactional emails.
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: sentThisMonth } = await supabase
    .from("email_campaigns")
    .select("recipient_count")
    .eq("status", "sent")
    .gte("sent_at", monthStart);
  const monthlyEmailsSent = (sentThisMonth || []).reduce(
    (sum, c) => sum + (c.recipient_count || 0),
    0
  );

  return <CampaignsManager campaigns={campaigns || []} monthlyEmailsSent={monthlyEmailsSent} />;
}
