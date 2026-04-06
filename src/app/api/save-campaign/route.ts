import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { id, name, subject, bodyText, contentBlocks, audienceType } = await req.json();

  if (!name && !subject) {
    return NextResponse.json({ error: "Name oder Betreff erforderlich." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Extract text summary from content blocks for the body_text column
  const textSummary = (contentBlocks || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n\n");

  const record = {
    name: name || null,
    subject: subject || "",
    body_text: textSummary,
    status: "draft" as const,
    // Store content blocks and audience type as JSON in body_text metadata
    // We'll encode them alongside the text for now
  };

  if (id) {
    // Update existing draft
    const { error } = await supabase
      .from("email_campaigns")
      .update(record)
      .eq("id", id)
      .eq("status", "draft"); // Only allow updating drafts

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, campaignId: id });
  } else {
    // Create new draft
    const { data: campaign, error } = await supabase
      .from("email_campaigns")
      .insert(record)
      .select("id")
      .single();

    if (error || !campaign) {
      return NextResponse.json({ error: error?.message || "Fehler beim Speichern." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, campaignId: campaign.id });
  }
}
