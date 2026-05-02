import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailHtml, type ContentBlock } from "@/lib/email-template";
import { decryptPatient } from "@/lib/encryption";
import { normalizeEmail } from "@/lib/email-normalize";
import { archiveSentMessage } from "@/lib/gmail";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const BATCH_SIZE = 100;

// Basic RFC-ish email pattern. Matches Resend's expectation of the
// `email@example.com` shape; rejects embedded spaces, commas, quotes and
// display-name-style strings like "Name <foo@bar.com>" (we never want the
// latter here — recipients are always just the address).
const EMAIL_RE = /^[^\s@,<>"']+@[^\s@,<>"']+\.[^\s@,<>"']+$/;

type AudienceType = "probandinnen" | "aerztinnen" | "alle";

interface Recipient {
  email: string;
  first_name: string | null;
}

/**
 * Sanitise a raw email value from the DB (which can be dirty: trailing
 * commas from CSV import, whitespace, quoted wrappers, "foo,bar@baz"
 * stacks). Returns the cleaned lowercase address, or null if it cannot
 * be made into a single valid recipient.
 */
function sanitizeRecipientEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Split on any delimiter a user might have typed into an email cell.
  const first = raw
    .split(/[,;\n\r]/)
    .map((s) => s.trim())
    .find(Boolean);
  if (!first) return null;
  // Strip wrapping < > or angle-bracketed display-name form.
  const inAngle = first.match(/<([^>]+)>/);
  const candidate = (inAngle ? inAngle[1] : first).trim().replace(/^["']|["']$/g, "");
  const cleaned = candidate.toLowerCase();
  if (!EMAIL_RE.test(cleaned)) return null;
  return cleaned;
}

export async function POST(req: NextRequest) {
  const {
    id: draftId,
    name,
    subject,
    contentBlocks,
    audienceType,
    excludedIds,
    includedIds,
    excludeBlacklisted,
    scheduledAt,
    attachments: rawAttachments,
  } = await req.json() as {
    id?: string;
    name: string;
    subject: string;
    contentBlocks: ContentBlock[];
    audienceType: AudienceType;
    excludedIds: string[];
    includedIds?: string[];
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
  // When includedIds is non-empty, the campaign is restricted to that
  // explicit set (intersected with the audience and the blacklist
  // filter). When empty, fall back to the legacy "audience minus
  // excluded" behaviour. The single Set wraps both branches: undefined
  // → no inclusion gate, defined → only IDs in the set are eligible.
  const includedSet =
    Array.isArray(includedIds) && includedIds.length > 0
      ? new Set(includedIds)
      : null;
  const emailsSeen = new Set<string>();
  const recipients: Recipient[] = [];
  // Track addresses that were filtered out so we can log/display why the
  // final count is lower than the expected audience size.
  const skippedInvalid: string[] = [];

  // Resolve recipients based on audience type
  if (audienceType === "probandinnen" || audienceType === "alle") {
    const { data: rawPatients } = await supabase.from("patients").select("*");
    const allPatients = (rawPatients || []).map(decryptPatient);
    for (const p of allPatients) {
      if (!p.email) continue;
      // "inactive" is a hard unsubscribe — ignore the excludeBlacklisted
      // toggle, they never receive campaigns.
      if (p.patient_status === "inactive") continue;
      if (excludeBlacklisted && p.patient_status === "blacklist") continue;
      if (excludedSet.has(`p-${p.id}`)) continue;
      if (includedSet && !includedSet.has(`p-${p.id}`)) continue;
      const cleaned = sanitizeRecipientEmail(p.email);
      if (!cleaned) {
        skippedInvalid.push(p.email);
        continue;
      }
      // Gmail-alias aware dedupe key (googlemail.com → gmail.com, drop dots).
      const dedupeKey = normalizeEmail(cleaned) || cleaned;
      if (emailsSeen.has(dedupeKey)) continue;
      emailsSeen.add(dedupeKey);
      recipients.push({ email: cleaned, first_name: p.first_name });
    }
  }

  if (audienceType === "aerztinnen" || audienceType === "alle") {
    const { data: azubis } = await supabase
      .from("auszubildende")
      .select("id, email, first_name, contact_type, status");
    for (const a of azubis || []) {
      const ct = a.contact_type as string | null;
      if (ct !== "auszubildende" && ct !== null) continue;
      if (!a.email) continue;
      // Hard unsubscribe — same semantics as the patients branch above.
      if ((a.status as string | null) === "inactive") continue;
      if (excludedSet.has(`a-${a.id}`)) continue;
      if (includedSet && !includedSet.has(`a-${a.id}`)) continue;
      const cleaned = sanitizeRecipientEmail(a.email);
      if (!cleaned) {
        skippedInvalid.push(a.email);
        continue;
      }
      const dedupeKey = normalizeEmail(cleaned) || cleaned;
      if (emailsSeen.has(dedupeKey)) continue;
      emailsSeen.add(dedupeKey);
      recipients.push({ email: cleaned, first_name: a.first_name });
    }
  }

  if (skippedInvalid.length > 0) {
    // Visible in Vercel/Railway logs so staff can fix the DB rows.
    console.warn(
      `send-campaign: skipped ${skippedInvalid.length} invalid email(s):`,
      skippedInvalid,
    );
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

  const recipientEmails = recipients.map((r) => r.email);

  // If the user sends an existing draft, UPDATE that row so `created_at`
  // reflects the original draft creation time (not the send time).
  let campaignId: string | null = null;
  if (draftId) {
    const { data: existing } = await supabase
      .from("email_campaigns")
      .select("id, status")
      .eq("id", draftId)
      .maybeSingle();
    if (existing && existing.status === "draft") {
      const { error: updErr } = await supabase
        .from("email_campaigns")
        .update({
          name: name || null,
          subject,
          body_text: bodyTextSummary,
          content_blocks: contentBlocks,
          recipient_count: recipients.length,
          recipient_emails: recipientEmails,
          excluded_patient_ids: Array.from(excludedSet),
          included_patient_ids: includedSet ? Array.from(includedSet) : [],
          audience_type: audienceType,
          status,
          scheduled_at: scheduledAt || null,
        })
        .eq("id", draftId);
      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
      campaignId = draftId;
    }
  }

  if (!campaignId) {
    const { data: campaign, error: insertErr } = await supabase
      .from("email_campaigns")
      .insert({
        name: name || null,
        subject,
        body_text: bodyTextSummary,
        content_blocks: contentBlocks,
        recipient_count: recipients.length,
        recipient_emails: recipientEmails,
        excluded_patient_ids: Array.from(excludedSet),
        audience_type: audienceType,
        status,
        scheduled_at: scheduledAt || null,
      })
      .select("id")
      .single();

    if (insertErr || !campaign) {
      return NextResponse.json({ error: insertErr?.message || "Kampagne konnte nicht gespeichert werden." }, { status: 500 });
    }
    campaignId = campaign.id;
  }

  try {
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      // Build (recipient, html, payload) so we can hand the same per-
      // recipient HTML to both Resend (real send) and archiveSentMessage
      // (Gmail mirror). Without retaining the html alongside, we'd have
      // to rebuild it twice.
      const items = batch.map((r) => {
        const html = buildEmailHtml({
          firstName: r.first_name || "Kolleg:in",
          contentBlocks,
        });
        const payload: Record<string, unknown> = {
          from: "EPHIA <customerlove@ephia.de>",
          to: [r.email],
          subject,
          html,
          ...(sendAtParam ? { send_at: sendAtParam } : {}),
        };
        if (rawAttachments && rawAttachments.length > 0) {
          payload.attachments = rawAttachments;
        }
        return { recipient: r, html, payload };
      });

      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(items.map((it) => it.payload)),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Resend batch error: ${errBody}`);
      }

      // Mirror each delivered recipient into the customerlove Gmail Sent
      // folder so the contact-profile email history (which queries Gmail
      // directly) shows the campaign.
      //
      // Scheduled campaigns are skipped here: Resend hasn't sent them
      // yet, and archiving now would falsely date the Gmail entry.
      // Once we wire a Resend `email.sent` webhook we can archive at
      // actual delivery time instead.
      //
      // Sequential per recipient to stay under Gmail's per-user
      // ~10 inserts/sec quota. Best-effort: a Gmail failure for one
      // recipient is logged but doesn't fail the whole campaign.
      if (!sendAtParam) {
        for (const { recipient, html } of items) {
          try {
            await archiveSentMessage({
              to: recipient.email,
              subject,
              html,
            });
          } catch (archiveErr) {
            console.error(
              `archiveSentMessage failed for ${recipient.email} (non-fatal):`,
              archiveErr,
            );
          }
        }
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
      .eq("id", campaignId);

    return NextResponse.json({ ok: true, campaignId, recipientCount: recipients.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    await supabase
      .from("email_campaigns")
      .update({ status: "failed", error_message: message })
      .eq("id", campaignId);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
