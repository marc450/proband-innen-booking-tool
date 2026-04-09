import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailHtml, type ContentBlock } from "@/lib/email-template";
import { decryptPatient } from "@/lib/encryption";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const BATCH_SIZE = 100;

type AudienceType = "probandinnen" | "aerztinnen" | "alle";

interface Recipient {
  email: string;
  first_name: string | null;
}

export async function POST(req: NextRequest) {
  const {
    name,
    subject,
    contentBlocks,
    audienceType,
    excludedIds,
    excludeBlacklisted,
    scheduledAt,
    attachments: rawAttachments,
  } = await req.json() as {
    name: string;
    subject: string;
    contentBlocks: ContentBlock[];
    audienceType: AudienceType;
    excludedIds: string[];
    excludeBlacklisted: boolean;
    scheduledAt: string | null;
    attachments?: { filename: string; content: string }[];
  };

  if (!subject || !contentBlocks?.length) {
    return NextResponse.json({ error: "Pflichtfelder fehlen." }, { status: 400 });
  }

  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY nicht konfiguriert." }, { status: 500 });
  }

  const supabase = createAdminClient();
  const excludedSet = new Set(excludedIds || []);
  const emailsSeen = new Set<string>();
  const recipients: Recipient[] = [];

  // Resolve recipients based on audience type
  if (audienceType === "probandinnen" || audienceType === "alle") {
    const { data: rawPatients } = await supabase.from("patients").select("*");
    const allPatients = (rawPatients || []).map(decryptPatient);
    for (const p of allPatients) {
      if (!p.email) continue;
      if (excludeBlacklisted && p.patient_status === "blacklist") continue;
      if (excludedSet.has(`p-${p.id}`)) continue;
      const emailLower = p.email.toLowerCase();
      if (emailsSeen.has(emailLower)) continue;
      emailsSeen.add(emailLower);
      recipients.push({ email: p.email, first_name: p.first_name });
    }
  }

  if (audienceType === "aerztinnen" || audienceType === "alle") {
    const { data: azubis } = await supabase
      .from("auszubildende")
      .select("id, email, first_name, contact_type");
    for (const a of azubis || []) {
      const ct = a.contact_type as string | null;
      if (ct !== "auszubildende" && ct !== null) continue;
      if (!a.email) continue;
      if (excludedSet.has(`a-${a.id}`)) continue;
      const emailLower = a.email.toLowerCase();
      if (emailsSeen.has(emailLower)) continue;
      emailsSeen.add(emailLower);
      recipients.push({ email: a.email, first_name: a.first_name });
    }
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: "Keine Empfänger:innen nach Filterung." }, { status: 400 });
  }

  // Determine status and send_at
  const status = scheduledAt ? "scheduled" : "sending";
  const sendAtParam = scheduledAt ? new Date(scheduledAt).toISOString() : undefined;

  // Store text summary for DB record
  const bodyTextSummary = contentBlocks
    .filter((b): b is ContentBlock & { type: "text" } => b.type === "text")
    .map((b) => b.text)
    .join("\n\n");

  // Save campaign to DB
  const { data: campaign, error: insertErr } = await supabase
    .from("email_campaigns")
    .insert({
      name: name || null,
      subject,
      body_text: bodyTextSummary,
      content_blocks: contentBlocks,
      recipient_count: recipients.length,
      excluded_patient_ids: Array.from(excludedSet),
      status,
      scheduled_at: scheduledAt || null,
    })
    .select("id")
    .single();

  if (insertErr || !campaign) {
    return NextResponse.json({ error: insertErr?.message || "Kampagne konnte nicht gespeichert werden." }, { status: 500 });
  }

  try {
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      const emails = batch.map((r) => {
        const email: Record<string, unknown> = {
          from: "EPHIA <customerlove@ephia.de>",
          to: [r.email],
          subject,
          html: buildEmailHtml({
            firstName: r.first_name || "Kolleg:in",
            contentBlocks,
          }),
          ...(sendAtParam ? { send_at: sendAtParam } : {}),
        };
        if (rawAttachments && rawAttachments.length > 0) {
          email.attachments = rawAttachments;
        }
        return email;
      });

      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emails),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Resend batch error: ${errBody}`);
      }

      // Brief pause between batches
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Update campaign as sent
    await supabase
      .from("email_campaigns")
      .update({
        status: scheduledAt ? "scheduled" : "sent",
        sent_at: scheduledAt ? null : new Date().toISOString(),
      })
      .eq("id", campaign.id);

    return NextResponse.json({ ok: true, campaignId: campaign.id, recipientCount: recipients.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    await supabase
      .from("email_campaigns")
      .update({ status: "failed", error_message: message })
      .eq("id", campaign.id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
