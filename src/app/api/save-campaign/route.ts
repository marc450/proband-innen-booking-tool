import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContentBlock } from "@/lib/email-template";

const STORAGE_BUCKET = "campaign-images";

// Upload base64 data-URL images to Supabase Storage, return public URL
async function uploadBlockImages(
  blocks: ContentBlock[],
  supabase: ReturnType<typeof createAdminClient>,
  campaignId: string,
): Promise<ContentBlock[]> {
  const result: ContentBlock[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type !== "image" || !block.src.startsWith("data:")) {
      result.push(block);
      continue;
    }

    try {
      const match = block.src.match(/^data:image\/([a-z+]+);base64,(.+)$/i);
      if (!match) { result.push(block); continue; }

      const ext = match[1] === "jpeg" ? "jpg" : (match[1] || "png").replace("+xml", "");
      const base64Data = match[2];
      const binaryStr = Buffer.from(base64Data, "base64");

      const filePath = `${campaignId}/${Date.now()}_${i}.${ext}`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, binaryStr, {
          contentType: `image/${match[1]}`,
          upsert: true,
        });

      if (error) { result.push(block); continue; }

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        result.push({ ...block, src: urlData.publicUrl });
      } else {
        result.push(block);
      }
    } catch {
      result.push(block);
    }
  }
  return result;
}

export async function POST(req: NextRequest) {
  const { id, name, subject, contentBlocks, audienceType, excludedIds, includedIds } = await req.json();

  if (!name && !subject) {
    return NextResponse.json({ error: "Name oder Betreff erforderlich." }, { status: 400 });
  }

  const safeAudience =
    audienceType === "probandinnen" || audienceType === "aerztinnen" || audienceType === "alle"
      ? audienceType
      : null;
  const safeExcluded = Array.isArray(excludedIds)
    ? (excludedIds as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  const safeIncluded = Array.isArray(includedIds)
    ? (includedIds as unknown[]).filter((v): v is string => typeof v === "string")
    : [];

  const supabase = createAdminClient();

  // Extract text summary for the body_text column (backwards compat)
  const textSummary = (contentBlocks || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n\n");

  if (id) {
    // Upload images for existing draft
    const safeBlocks = await uploadBlockImages(contentBlocks || [], supabase, id);

    const { error } = await supabase
      .from("email_campaigns")
      .update({
        name: name || null,
        subject: subject || "",
        body_text: textSummary,
        content_blocks: safeBlocks,
        audience_type: safeAudience,
        excluded_patient_ids: safeExcluded,
        included_patient_ids: safeIncluded,
        status: "draft",
      })
      .eq("id", id)
      .eq("status", "draft");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, campaignId: id });
  } else {
    // Create new draft first to get an ID for image storage paths
    const { data: campaign, error } = await supabase
      .from("email_campaigns")
      .insert({
        name: name || null,
        subject: subject || "",
        body_text: textSummary,
        content_blocks: contentBlocks || [],
        audience_type: safeAudience,
        excluded_patient_ids: safeExcluded,
        included_patient_ids: safeIncluded,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !campaign) {
      return NextResponse.json({ error: error?.message || "Fehler beim Speichern." }, { status: 500 });
    }

    // Now upload images with the campaign ID as storage path
    const safeBlocks = await uploadBlockImages(contentBlocks || [], supabase, campaign.id);
    if (safeBlocks.some((b, i) => b !== (contentBlocks || [])[i])) {
      await supabase
        .from("email_campaigns")
        .update({ content_blocks: safeBlocks })
        .eq("id", campaign.id);
    }

    return NextResponse.json({ ok: true, campaignId: campaign.id });
  }
}
