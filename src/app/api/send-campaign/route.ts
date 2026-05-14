import { NextRequest, NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailHtml, type ContentBlock } from "@/lib/email-template";
import { decryptPatient } from "@/lib/encryption";
import { normalizeEmail } from "@/lib/email-normalize";
import { buildPatientEmailSet, isAlsoAPatient } from "@/lib/campaign-audience";
import { archiveSentMessage } from "@/lib/gmail";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const BATCH_SIZE = 100;

// Basic RFC-ish email pattern. Matches Resend's expectation of the
// `email@example.com` shape; rejects embedded spaces, commas, quotes and
// display-name-style strings like "Name <foo@bar.com>" (we never want the
// latter here — recipients are always just the address).
const EMAIL_RE = /^[^\s@,<>"']+@[^\s@,<>"']+\.[^\s@,<>"']+$/;

type AudienceType = "probandinnen" | "aerztinnen" | "alle";

type ContactKind = "p" | "a";

interface Recipient {
  email: string;
  first_name: string | null;
  // Composite key prefix + uuid, e.g. "p-<uuid>" or "a-<uuid>". Used
  // verbatim in the unsubscribe URL so /api/unsubscribe knows which
  // table to flip.
  contactKey: string;
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://proband-innen.ephia.de";

function buildUnsubscribeUrl(contactKey: string): string {
  return `${APP_URL}/abmelden?id=${encodeURIComponent(contactKey)}`;
}

function buildListUnsubscribePostUrl(contactKey: string): string {
  // RFC 8058 one-click endpoint. Mail clients (Gmail, Apple Mail) POST
  // here directly without rendering the /abmelden page.
  return `${APP_URL}/api/unsubscribe?id=${encodeURIComponent(contactKey)}`;
}

function contactKeyFor(kind: ContactKind, id: string): string {
  return `${kind}-${id}`;
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

  // Always materialise the patient list up front. We need the email set
  // even when audience === "aerztinnen" so we can drop v_auszubildende
  // rows that secretly correspond to Probandinnen (reported regression:
  // "Lydia Lemke" leaked into the Ärzt:innen-only campaign).
  const { data: rawPatients } = await supabase.from("patients").select("*");
  const allPatients = (rawPatients || []).map(decryptPatient);
  const sendablePatients = allPatients.filter((p) => p.patient_status !== "inactive");
  const patientEmails = buildPatientEmailSet(sendablePatients);

  // Resolve recipients based on audience type
  if (audienceType === "probandinnen" || audienceType === "alle") {
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
      recipients.push({
        email: cleaned,
        first_name: p.first_name,
        contactKey: contactKeyFor("p", p.id),
      });
    }
  }

  if (audienceType === "aerztinnen" || audienceType === "alle") {
    const { data: azubis } = await supabase
      .from("v_auszubildende")
      .select("id, email, first_name, contact_type, status");
    for (const a of azubis || []) {
      const ct = a.contact_type as string | null;
      if (ct !== "auszubildende" && ct !== null) continue;
      if (!a.email) continue;
      // Hard unsubscribe — same semantics as the patients branch above.
      if ((a.status as string | null) === "inactive") continue;
      // Cross-table reclassification: if this auszubildende row's email
      // is also a Probandin's email, treat them as Probandin and skip
      // for the Ärzt:innen audience. Matches the composer-side filter
      // in dashboard/campaigns/new/page.tsx so the recipient counts
      // align between UI preview and actual send.
      if (isAlsoAPatient({ email: a.email }, patientEmails)) continue;
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
      recipients.push({
        email: cleaned,
        first_name: a.first_name,
        contactKey: contactKeyFor("a", a.id),
      });
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

      const payloads = batch.map((r) => {
        const unsubscribeUrl = buildUnsubscribeUrl(r.contactKey);
        const oneClickUrl = buildListUnsubscribePostUrl(r.contactKey);
        const html = buildEmailHtml({
          firstName: r.first_name || "Kolleg:in",
          contentBlocks,
          unsubscribeUrl,
        });
        const payload: Record<string, unknown> = {
          from: "EPHIA <customerlove@ephia.de>",
          to: [r.email],
          subject,
          html,
          // RFC 2369 + RFC 8058. Gmail/Apple Mail render a native
          // "Unsubscribe" link next to the sender name when both
          // headers are present, and POST to oneClickUrl directly.
          // Required for sender reputation at our volume.
          headers: {
            "List-Unsubscribe": `<${oneClickUrl}>, <${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          ...(sendAtParam ? { send_at: sendAtParam } : {}),
          // Scheduled sends: tag so the Resend webhook archives the
          // message into Gmail Sent at actual delivery time. Immediate
          // sends archive in a detached after() callback below, no tag
          // needed (and no tag means the webhook ignores them,
          // preventing double-archive).
          ...(sendAtParam
            ? {
                tags: [
                  { name: "ephia-archive", value: "campaign-scheduled" },
                ],
              }
            : {}),
        };
        if (rawAttachments && rawAttachments.length > 0) {
          payload.attachments = rawAttachments;
        }
        return payload;
      });

      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloads),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Resend batch error: ${errBody}`);
      }

      // Brief pause between batches to stay under Resend's 2 req/s rate limit.
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Resend has accepted everything. Mark the campaign sent and seed
    // the Gmail-archive tracking columns. Scheduled sends are marked
    // 'skipped' here because the Resend webhook handles archiving at
    // actual delivery time, not now.
    const archiveSeed = sendAtParam
      ? { gmail_archive_status: "skipped" as const, gmail_archive_total: 0 }
      : {
          gmail_archive_status: "pending" as const,
          gmail_archive_total: recipients.length,
          gmail_archive_progress: 0,
          gmail_archive_failed: 0,
          gmail_archive_error: null,
          gmail_archive_started_at: new Date().toISOString(),
          gmail_archive_finished_at: null,
        };

    await supabase
      .from("email_campaigns")
      .update({
        status: scheduledAt ? "scheduled" : "sent",
        sent_at: scheduledAt ? null : new Date().toISOString(),
        ...archiveSeed,
      })
      .eq("id", campaignId);

    // Detach the Gmail Sent-folder mirror so staff don't wait on it.
    // Gmail's per-user insert quota is ~10/sec, and each insert is a
    // 200-500ms round trip. At 400 recipients that's 1-2 minutes that
    // would otherwise block the response. after() runs the callback
    // after the response is flushed but still inside the same Node
    // process on Railway, so progress updates the email_campaigns row.
    if (!sendAtParam) {
      after(
        archiveCampaignToGmail({
          campaignId: campaignId!,
          recipients,
          contentBlocks,
          subject,
        }),
      );
    }

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

/**
 * Mirror every campaign recipient into the customerlove Gmail Sent
 * folder so the contact-profile email history (which queries Gmail
 * directly) shows the campaign.
 *
 * Runs detached via `after()` so the HTTP response is already on its
 * way back to the dashboard. Progress is flushed to email_campaigns
 * every FLUSH_EVERY recipients so the campaign detail view can render
 * a live "247 / 400" counter without per-row DB pressure.
 *
 * Sequential per recipient to stay under Gmail's per-user ~10
 * inserts/sec quota. Best-effort: a failure for one recipient is
 * logged and counted but doesn't abort the whole archive.
 */
async function archiveCampaignToGmail(opts: {
  campaignId: string;
  recipients: Recipient[];
  contentBlocks: ContentBlock[];
  subject: string;
}) {
  const supabase = createAdminClient();
  const total = opts.recipients.length;
  const FLUSH_EVERY = 25;
  let ok = 0;
  let fail = 0;
  let lastError: string | null = null;

  try {
    for (let idx = 0; idx < total; idx++) {
      const r = opts.recipients[idx];
      const html = buildEmailHtml({
        firstName: r.first_name || "Kolleg:in",
        contentBlocks: opts.contentBlocks,
        unsubscribeUrl: buildUnsubscribeUrl(r.contactKey),
      });
      try {
        await archiveSentMessage({ to: r.email, subject: opts.subject, html });
        ok++;
      } catch (err) {
        fail++;
        lastError = err instanceof Error ? err.message : String(err);
        console.error(
          `archiveSentMessage failed for ${r.email} (non-fatal):`,
          err,
        );
      }

      const isLast = idx === total - 1;
      if ((idx + 1) % FLUSH_EVERY === 0 || isLast) {
        await supabase
          .from("email_campaigns")
          .update({
            gmail_archive_progress: ok,
            gmail_archive_failed: fail,
            gmail_archive_error: lastError,
          })
          .eq("id", opts.campaignId);
      }
    }

    const finalStatus =
      fail === 0 ? "done" : ok === 0 ? "failed" : "partial";
    await supabase
      .from("email_campaigns")
      .update({
        gmail_archive_status: finalStatus,
        gmail_archive_progress: ok,
        gmail_archive_failed: fail,
        gmail_archive_error: lastError,
        gmail_archive_finished_at: new Date().toISOString(),
      })
      .eq("id", opts.campaignId);
  } catch (err) {
    // Catches anything outside the per-recipient try (e.g. a fatal
    // token-refresh failure on the very first call).
    const message = err instanceof Error ? err.message : String(err);
    console.error("archiveCampaignToGmail catastrophic failure:", err);
    await supabase
      .from("email_campaigns")
      .update({
        gmail_archive_status: "failed",
        gmail_archive_error: message,
        gmail_archive_finished_at: new Date().toISOString(),
      })
      .eq("id", opts.campaignId);
  }
}
