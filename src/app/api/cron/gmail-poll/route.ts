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
}) {
  const displayFrom = args.fromName
    ? `${args.fromName} <${args.fromEmail}>`
    : args.fromEmail;
  const subjectLine = args.subject || "(kein Betreff)";
  const bodyLines = [
    `*Von:* ${displayFrom}`,
    `*Betreff:* ${subjectLine}`,
  ];
  if (args.preview) bodyLines.push(`*Inhalt:* ${args.preview}`);
  return {
    // Bot identity (name + avatar) is set on the Slack app itself
    // ("Neue E-Mail!"). New-style Incoming Webhooks ignore any
    // username/icon_emoji override in the payload, so we don't bother.
    // The fallback `text` is what shows in notifications/desktop banners.
    text: `Neue E-Mail von ${displayFrom}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: bodyLines.join("\n"),
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            // Hardcoded: the inbox lives behind staff auth on the admin
            // host. NEXT_PUBLIC_APP_URL points at the public booking
            // domain (proband-innen.ephia.de), which doesn't render
            // /dashboard/inbox at all.
            text: { type: "plain_text", text: "Im Dashboard öffnen" },
            url: "https://admin.ephia.de/dashboard/inbox",
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "_Bitte Haken setzen wenn beantwortet._",
          },
        ],
      },
    ],
  };
}

async function postToSlack(payload: object) {
  // Dedicated webhook for the #customerlove channel. We deliberately do
  // NOT fall back to SLACK_WEBHOOK_URL — that webhook posts into the
  // Proband:innen booking channel and the wrong channel is worse than
  // a missing notification. If the env var isn't set, we throw and the
  // route returns the error in its response, the cron logs it, and
  // nothing leaks into the wrong channel.
  const url = process.env.SLACK_WEBHOOK_URL_CUSTOMERLOVE;
  if (!url) throw new Error("SLACK_WEBHOOK_URL_CUSTOMERLOVE not set");
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
