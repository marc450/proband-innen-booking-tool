import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/gmail";

// Replaces the old Zapier "invoice@ephia.de → autobox@sevdesk.email + Slack
// finance" zap. Polled every 5 min by Railway sevdesk-cron. Finds new INBOX
// messages on invoice@ephia.de that have at least one PDF attachment, forwards
// each PDF to sevDesk's auto-upload mailbox, posts a card to #finance, then
// tags the message with the "sevdesk-forwarded" Gmail label so the next poll
// skips it. No DB state — Gmail itself is the bookmark.

const INVOICE_EMAIL = "invoice@ephia.de";
const SEVDESK_MAILBOX = "autobox@sevdesk.email";
const SLACK_CHANNEL = "finance";
const SLACK_BOT_USERNAME = "Neue Rechnung auf Sevdesk!";
const SLACK_BOT_ICON = ":credit_card:";
const FORWARDED_LABEL = "sevdesk-forwarded";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

async function gmailFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`${GMAIL_API}/users/me/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail API ${res.status}: ${err}`);
  }
  return res.json();
}

async function ensureForwardedLabelId(token: string): Promise<string> {
  const list = (await gmailFetch("labels", token)) as {
    labels: { id: string; name: string }[];
  };
  const existing = list.labels.find((l) => l.name === FORWARDED_LABEL);
  if (existing) return existing.id;
  const created = (await gmailFetch("labels", token, {
    method: "POST",
    body: JSON.stringify({
      name: FORWARDED_LABEL,
      labelListVisibility: "labelHide",
      messageListVisibility: "hide",
    }),
  })) as { id: string };
  return created.id;
}

interface GmailListResponse {
  messages?: { id: string; threadId: string }[];
}

interface GmailPart {
  mimeType: string;
  filename?: string;
  body?: { data?: string; size: number; attachmentId?: string };
  parts?: GmailPart[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  payload: {
    headers: { name: string; value: string }[];
    mimeType: string;
    body?: { data?: string; size: number };
    parts?: GmailPart[];
  };
}

interface PdfAttachment {
  filename: string;
  attachmentId: string;
}

function findPdfAttachments(message: GmailMessage): PdfAttachment[] {
  const found: PdfAttachment[] = [];
  function walk(parts?: GmailPart[]) {
    if (!parts) return;
    for (const part of parts) {
      const isPdf =
        part.mimeType === "application/pdf" ||
        (part.filename?.toLowerCase().endsWith(".pdf") ?? false);
      if (isPdf && part.filename && part.body?.attachmentId) {
        found.push({ filename: part.filename, attachmentId: part.body.attachmentId });
      }
      if (part.parts) walk(part.parts);
    }
  }
  walk(message.payload.parts);
  return found;
}

async function listUnprocessedMessages(token: string): Promise<{ id: string }[]> {
  // newer_than:2d is a safety window so a single broken run doesn't lose
  // forwards. has:attachment narrows to candidates; PDF check happens at the
  // per-message level since the Gmail query language has no MIME filter.
  const q = encodeURIComponent(
    `label:INBOX -label:${FORWARDED_LABEL} has:attachment newer_than:2d`,
  );
  const data = (await gmailFetch(`messages?q=${q}&maxResults=25`, token)) as GmailListResponse;
  return data.messages || [];
}

async function applyForwardedLabel(token: string, messageId: string, labelId: string) {
  await gmailFetch(`messages/${messageId}/modify`, token, {
    method: "POST",
    body: JSON.stringify({ addLabelIds: [labelId] }),
  });
}

async function downloadAttachmentBuffer(
  token: string,
  messageId: string,
  attachmentId: string,
): Promise<Buffer> {
  const data = (await gmailFetch(
    `messages/${messageId}/attachments/${attachmentId}`,
    token,
  )) as { data: string; size: number };
  // Gmail returns base64url; decode straight to a Buffer that we can both
  // re-encode for the sevDesk MIME forward and stream to Slack.
  return Buffer.from(data.data, "base64url");
}

async function sendForwardEmail(
  token: string,
  pdfFilename: string,
  pdfBuffer: Buffer,
) {
  const pdfBase64 = pdfBuffer.toString("base64");
  const boundary = `boundary_${Date.now()}`;
  const subject = "Neuer Beleg für EPHIA Medical GmbH";
  const body = "Automatischer Upload aus invoice@ephia.de";

  const rawHeaders = [
    `From: ${INVOICE_EMAIL}`,
    `To: ${SEVDESK_MAILBOX}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];

  const parts: string[] = [
    rawHeaders.join("\r\n"),
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    body,
    `--${boundary}`,
    `Content-Type: application/pdf; name="${pdfFilename}"`,
    `Content-Disposition: attachment; filename="${pdfFilename}"`,
    "Content-Transfer-Encoding: base64",
    "",
    pdfBase64,
    `--${boundary}--`,
  ];

  const rawBody = parts.join("\r\n");
  const encodedMessage = Buffer.from(rawBody)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmailFetch("messages/send", token, {
    method: "POST",
    body: JSON.stringify({ raw: encodedMessage }),
  });
}

async function postSlackNotification(pdfFilename: string, pdfBuffer: Buffer) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN not set");

  const text = [
    "Es ist eine neue Rechnung auf Sevdesk!",
    "Hier geht's zur Freigabe:",
    "https://my.sevdesk.de/ex/VOU",
    "Bitte Haken setzen wenn bezahlt.",
  ].join("\n");

  // 1. Post the styled text via chat.postMessage. `username` + `icon_emoji`
  // overrides require chat:write.customize. We capture the channel id +
  // message ts so step 3 can pin the PDF to this exact thread.
  const postRes = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL,
      text,
      username: SLACK_BOT_USERNAME,
      icon_emoji: SLACK_BOT_ICON,
      unfurl_links: false,
      unfurl_media: false,
    }),
  });
  const postJson = (await postRes.json()) as {
    ok: boolean;
    error?: string;
    channel?: string;
    ts?: string;
  };
  if (!postJson.ok) throw new Error(`Slack postMessage: ${postJson.error || "unknown error"}`);

  // 2. Reserve an upload URL for the PDF. files.getUploadURLExternal requires
  // the files:write scope on the bot.
  const urlRes = await fetch("https://slack.com/api/files.getUploadURLExternal", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      filename: pdfFilename,
      length: String(pdfBuffer.length),
    }),
  });
  const urlJson = (await urlRes.json()) as {
    ok: boolean;
    error?: string;
    upload_url?: string;
    file_id?: string;
  };
  if (!urlJson.ok || !urlJson.upload_url || !urlJson.file_id) {
    throw new Error(`Slack getUploadURLExternal: ${urlJson.error || "unknown error"}`);
  }

  // 3. PUT the bytes to the temp upload URL. Slack returns a non-JSON body
  // here; we only care about HTTP status.
  const fd = new FormData();
  // Buffer extends Uint8Array but the lib.dom Blob typings don't accept it
  // directly under our TS config; the explicit Uint8Array view is a copy
  // that sidesteps the BlobPart mismatch without changing wire bytes.
  fd.append(
    "file",
    new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }),
    pdfFilename,
  );
  const uploadRes = await fetch(urlJson.upload_url, { method: "POST", body: fd });
  if (!uploadRes.ok) {
    throw new Error(`Slack upload bytes: HTTP ${uploadRes.status}`);
  }

  // 4. Finalize the upload as a thread reply on the just-posted message.
  // Without `thread_ts` Slack would post the file as a fresh top-level
  // message in the channel (default-bot identity, breaks the styled flow).
  const completeRes = await fetch("https://slack.com/api/files.completeUploadExternal", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      files: [{ id: urlJson.file_id, title: pdfFilename }],
      channel_id: postJson.channel,
      thread_ts: postJson.ts,
    }),
  });
  const completeJson = (await completeRes.json()) as { ok: boolean; error?: string };
  if (!completeJson.ok) {
    throw new Error(`Slack completeUploadExternal: ${completeJson.error || "unknown error"}`);
  }
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Transient upstream failures (Gmail rate limits, 5xx, Supabase blips) must
  // not crash the Railway cron container. We swallow everything into a 200
  // response with `ok:false` + reason so curl stays happy and the service is
  // back to "ready" before the next 5-min tick.
  try {
    let token: string;
    try {
      token = await getValidAccessToken(INVOICE_EMAIL);
    } catch (e) {
      return NextResponse.json({
        ok: false,
        reason: e instanceof Error ? e.message : "no gmail token",
      });
    }

    const labelId = await ensureForwardedLabelId(token);
    const messages = await listUnprocessedMessages(token);

    let forwarded = 0;
    let skippedNoPdf = 0;
    const errors: string[] = [];

    for (const m of messages) {
      try {
        const full = (await gmailFetch(`messages/${m.id}?format=full`, token)) as GmailMessage;
        const pdfs = findPdfAttachments(full);

        if (pdfs.length === 0) {
          // No PDFs, label so we don't keep checking. Other attachments
          // (images, docs) are intentionally ignored to match the original Zap.
          await applyForwardedLabel(token, m.id, labelId);
          skippedNoPdf++;
          continue;
        }

        // One forward + one Slack ping per PDF, mirroring the Zapier "New
        // Attachment" trigger which fires per attachment. sevDesk creates one
        // Beleg per inbound email so this gives one Beleg per PDF.
        for (const pdf of pdfs) {
          const buffer = await downloadAttachmentBuffer(token, m.id, pdf.attachmentId);
          await sendForwardEmail(token, pdf.filename, buffer);
          await postSlackNotification(pdf.filename, buffer);
          forwarded++;
        }

        await applyForwardedLabel(token, m.id, labelId);
      } catch (e) {
        errors.push(`${m.id}: ${e instanceof Error ? e.message : "unknown error"}`);
      }
    }

    return NextResponse.json({
      ok: true,
      scanned: messages.length,
      forwarded,
      skippedNoPdf,
      errors,
    });
  } catch (e) {
    console.error("sevdesk-forwarder top-level error:", e);
    return NextResponse.json({
      ok: false,
      reason: e instanceof Error ? e.message : "unknown top-level error",
    });
  }
}
