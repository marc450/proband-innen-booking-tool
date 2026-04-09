export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptPatient } from "@/lib/encryption";
import { notFound, redirect } from "next/navigation";
import { CampaignComposer } from "../new/campaign-composer";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // Fetch the campaign — only drafts are editable
  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (!campaign) notFound();
  if (campaign.status !== "draft") redirect("/dashboard/campaigns");

  const [{ data: patients }, { data: auszubildende }] = await Promise.all([
    supabase.from("patients").select("*").order("created_at"),
    adminSupabase
      .from("auszubildende")
      .select("id, email, first_name, last_name, status, contact_type")
      .order("last_name", { ascending: true }),
  ]);

  const decrypted = (patients || []).map(decryptPatient);

  const filteredAzubis = (auszubildende || []).filter((a) => {
    const ct = a.contact_type as string | null;
    return ct === "auszubildende" || ct == null;
  });

  return (
    <CampaignComposer
      patients={decrypted.map((p) => ({
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
      existingCampaign={{
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        body_text: campaign.body_text,
        content_blocks: campaign.content_blocks,
      }}
    />
  );
}
