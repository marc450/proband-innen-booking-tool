import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/gmail";
import {
  NOTIFIED_LABEL_NAME,
  processInboundMessage,
} from "@/lib/gmail-inbound-processor";

// LEGACY: this route was the original 5-minute polling cron. Push
// notifications via Pub/Sub (/api/gmail/push-webhook) are now the
// primary delivery channel; this route is kept as a manual fallback
// that staff can hit if the push pipeline ever fails. It is no longer
// wired to the Railway cron service — invoke it manually with a
// `Bearer <CRON_SECRET>` header to drain anything Pub/Sub missed.

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

async function ensureNotifiedLabelId(token: string): Promise<string> {
  const list = (await gmailFetch("labels", token)) as {
    labels: { id: string; name: string }[];
  };
  const existing = list.labels.find((l) => l.name === NOTIFIED_LABEL_NAME);
  if (existing) return existing.id;
  const created = (await gmailFetch("labels", token, {
    method: "POST",
    body: JSON.stringify({
      name: NOTIFIED_LABEL_NAME,
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
  const q = encodeURIComponent(
    `label:INBOX -label:${NOTIFIED_LABEL_NAME} -from:me newer_than:1d`,
  );
  const data = (await gmailFetch(
    `messages?q=${q}&maxResults=25`,
    token,
  )) as GmailListResponse;
  return data.messages || [];
}

async function postToSlackCustomerLove(payload: object) {
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
    return NextResponse.json({
      ok: false,
      reason: e instanceof Error ? e.message : "no gmail token",
    });
  }

  const notifiedLabelId = await ensureNotifiedLabelId(token);
  const messages = await listUnnotifiedMessages(token);

  // Verbose-by-default in the cron path. Railway's deploy logs surface
  // any console.log to the service log stream, which until now has
  // been silent for this route because the curl command in
  // customerlove-cron uses `-fsS` and discards the response body.
  // Logging the input scan + per-message outcome here gives us
  // post-hoc visibility ("did the auto-reply fire? did the recipient
  // get skipped? why?") without needing to capture HTTP responses.
  console.log(
    `[gmail-poll] scan: ${messages.length} unnotified message(s)`,
  );

  const outcomes = [] as unknown[];
  let notified = 0;
  let skipped = 0;
  let autoRepliedSent = 0;
  const errors: string[] = [];

  for (const m of messages) {
    try {
      const outcome = await processInboundMessage(m.id, {
        notifiedLabelId,
        postSlack: postToSlackCustomerLove,
      });
      outcomes.push(outcome);
      console.log(
        `[gmail-poll] ${m.id} → ${outcome.status}` +
          (outcome.autoReply
            ? ` autoReply=${outcome.autoReply.status}` +
              ("reason" in outcome.autoReply && outcome.autoReply.reason
                ? `(${outcome.autoReply.reason})`
                : "")
            : "") +
          (outcome.reason ? ` reason=${outcome.reason}` : ""),
      );
      if (outcome.status === "notified" || outcome.status === "auto-replied") {
        notified++;
        if (outcome.autoReply?.status === "sent") autoRepliedSent++;
      } else if (
        outcome.status === "skipped-outbound" ||
        outcome.status === "skipped-already-notified"
      ) {
        skipped++;
      } else if (outcome.status === "error") {
        errors.push(`${m.id}: ${outcome.reason}`);
      }
    } catch (e) {
      errors.push(
        `${m.id}: ${e instanceof Error ? e.message : "unknown error"}`,
      );
      console.error(
        `[gmail-poll] ${m.id} threw`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: messages.length,
    notified,
    skipped,
    autoRepliedSent,
    errors,
    outcomes,
  });
}
