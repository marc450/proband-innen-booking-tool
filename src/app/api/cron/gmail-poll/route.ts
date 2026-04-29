import { NextResponse } from "next/server";
import {
  getValidAccessToken,
  getMessage,
  getHeader,
  getBody,
  extractEmailAddress,
  extractName,
  isInbound,
} from "@/lib/gmail";

// Polled every 5 min by Railway customerlove-cron. Finds unread INBOX
// messages that haven't been Slack-notified yet, posts a card to the
// customerlove webhook for each one, then tags the message with the
// "slack-notified" Gmail label so the next poll skips it. No DB state
// — Gmail itself is the bookmark.

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const NOTIFIED_LABEL = "slack-notified";

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

// Find or create the user-defined "slack-notified" label. Returns its id.
async function ensureNotifiedLabelId(token: string): Promise<string> {
  const list = (await gmailFetch("labels", token)) as {
    labels: { id: string; name: string }[];
  };
  const existing = list.labels.find((l) => l.name === NOTIFIED_LABEL);
  if (existing) return existing.id;
  const created = (await gmailFetch("labels", token, {
    method: "POST",
    body: JSON.stringify({
      name: NOTIFIED_LABEL,
      labelListVisibility: "labelHide",
      messageListVisibility: "hide",
    }),
  })) as { id: string };
  return created.id;
}

interface GmailListResponse {
  messages?: { id: string; threadId: string }[];
  resultSizeEstimate: number;
}

async function listUnnotifiedMessages(token: string): Promise<{ id: string }[]> {
  // newer_than:1d as a safety window so we never spam old history if the
  // label-tag step fails. -from:me skips outbound that ends up in INBOX
  // via aliasing.
  const q = encodeURIComponent(
    `label:INBOX -label:${NOTIFIED_LABEL} -from:me newer_than:1d`,
  );
  const data = (await gmailFetch(
    `messages?q=${q}&maxResults=25`,
    token,
  )) as GmailListResponse;
  return data.messages || [];
}

async function applyNotifiedLabel(
  token: string,
  messageId: string,
  labelId: string,
) {
  await gmailFetch(`messages/${messageId}/modify`, token, {
    method: "POST",
    body: JSON.stringify({ addLabelIds: [labelId] }),
  });
}

function buildSlackPayload(args: {
  fromName: string;
  fromEmail: string;
  subject: string;
  preview: string;
  messageId: string;
  threadId: string;
}) {
  const displayFrom = args.fromName
    ? `${args.fromName} <${args.fromEmail}>`
    : args.fromEmail;
  const link = `https://mail.google.com/mail/u/0/#inbox/${args.threadId}`;
  return {
    text: `:incoming_envelope: Neue E-Mail an customerlove@ephia.de`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:incoming_envelope: *Neue E-Mail an customerlove@ephia.de*`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Von:*\n${displayFrom}` },
          { type: "mrkdwn", text: `*Betreff:*\n${args.subject || "(kein Betreff)"}` },
        ],
      },
      ...(args.preview
        ? [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `>${args.preview.replace(/\n/g, "\n>")}`,
              },
            },
          ]
        : []),
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "In Gmail öffnen" },
            url: link,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Im Dashboard öffnen" },
            url: `${process.env.NEXT_PUBLIC_APP_URL || "https://admin.ephia.de"}/dashboard/inbox`,
          },
        ],
      },
    ],
  };
}

async function postToSlack(payload: object) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) throw new Error("SLACK_WEBHOOK_URL not set");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Slack ${res.status}: ${err}`);
  }
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let token: string;
  try {
    token = await getValidAccessToken();
  } catch (e) {
    // Don't crash the cron container — return 200 with a noop so the
    // Railway service stays "ready" while Gmail is being reconnected.
    return NextResponse.json({
      ok: false,
      reason: e instanceof Error ? e.message : "no gmail token",
    });
  }

  const labelId = await ensureNotifiedLabelId(token);
  const messages = await listUnnotifiedMessages(token);

  let notified = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const m of messages) {
    try {
      const full = await getMessage(m.id);
      if (!isInbound(full)) {
        skipped++;
        await applyNotifiedLabel(token, m.id, labelId);
        continue;
      }
      const fromHeader = getHeader(full, "From");
      const subject = getHeader(full, "Subject");
      const { text, html } = getBody(full);
      const preview = (text || html.replace(/<[^>]+>/g, " "))
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 280);

      await postToSlack(
        buildSlackPayload({
          fromName: extractName(fromHeader),
          fromEmail: extractEmailAddress(fromHeader),
          subject,
          preview,
          messageId: m.id,
          threadId: full.threadId,
        }),
      );
      await applyNotifiedLabel(token, m.id, labelId);
      notified++;
    } catch (e) {
      errors.push(
        `${m.id}: ${e instanceof Error ? e.message : "unknown error"}`,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: messages.length,
    notified,
    skipped,
    errors,
  });
}
