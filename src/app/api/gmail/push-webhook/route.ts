import { NextRequest, NextResponse } from "next/server";
import {
  advanceLastProcessedHistoryId,
  getGmailWatchState,
  listHistorySinceMessageAdded,
} from "@/lib/gmail";
import {
  NOTIFIED_LABEL_NAME,
  processInboundMessage,
} from "@/lib/gmail-inbound-processor";

/**
 * Gmail → Pub/Sub → here. The Pub/Sub push subscription POSTs every
 * Gmail INBOX notification to this route. We then:
 *
 *   1. Auth-check the request via a token in the query string (so only
 *      our Pub/Sub subscription can drive the route).
 *   2. Decode the Pub/Sub envelope. The `message.data` field is a
 *      base64 JSON blob shaped { emailAddress, historyId }.
 *   3. Resolve the resume cursor from gmail_tokens
 *      (last_processed_history_id), call users.history.list, and run
 *      the shared inbound-message processor on every messageAdded.
 *   4. Advance last_processed_history_id.
 *
 * Idempotency: Pub/Sub is at-least-once. We never throw — a non-200
 * response would cause Pub/Sub to retry the same notification, which
 * is fine because the processor is idempotent (slack-notified label +
 * inbox_auto_replies dedup row). We only respond non-200 when the
 * request is unauthenticated.
 *
 * Important: Pub/Sub waits at most `ackDeadline` seconds (default 10,
 * up to 600) for a 2xx response. The push subscription should be
 * configured with an ack deadline of 60s so the history+processing
 * fits comfortably even under transient Gmail-API latency.
 */

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

interface PubSubPushEnvelope {
  message?: {
    data?: string;
    messageId?: string;
    publishTime?: string;
    attributes?: Record<string, string>;
  };
  subscription?: string;
}

interface GmailWatchPayload {
  emailAddress: string;
  historyId: string | number;
}

async function ensureNotifiedLabelId(token: string): Promise<string> {
  const res = await fetch(`${GMAIL_API}/users/me/labels`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Gmail labels list failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    labels: { id: string; name: string }[];
  };
  const existing = data.labels.find((l) => l.name === NOTIFIED_LABEL_NAME);
  if (existing) return existing.id;
  const createRes = await fetch(`${GMAIL_API}/users/me/labels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: NOTIFIED_LABEL_NAME,
      labelListVisibility: "labelHide",
      messageListVisibility: "hide",
    }),
  });
  if (!createRes.ok) {
    throw new Error(`Gmail label create failed: ${createRes.status}`);
  }
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

export async function POST(req: NextRequest) {
  // 1. Auth: shared secret in the query string. Pub/Sub push
  //    subscriptions support adding query params to the endpoint URL,
  //    which is the simplest verification mechanism. Reject anything
  //    that doesn't carry the right token before doing any work.
  const expected = process.env.GMAIL_PUSH_VERIFICATION_TOKEN;
  const provided = req.nextUrl.searchParams.get("token");
  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse the Pub/Sub envelope. Always return 200 from here on so
  //    Pub/Sub doesn't pile up retries for malformed messages (those
  //    would be permanent failures anyway).
  let envelope: PubSubPushEnvelope;
  try {
    envelope = (await req.json()) as PubSubPushEnvelope;
  } catch {
    return NextResponse.json({ ok: true, reason: "invalid json" });
  }
  const data = envelope.message?.data;
  if (!data) {
    return NextResponse.json({ ok: true, reason: "no data" });
  }

  let payload: GmailWatchPayload;
  try {
    payload = JSON.parse(
      Buffer.from(data, "base64").toString("utf-8"),
    ) as GmailWatchPayload;
  } catch {
    return NextResponse.json({ ok: true, reason: "invalid payload" });
  }
  const notificationHistoryId = String(payload.historyId);
  if (!notificationHistoryId) {
    return NextResponse.json({ ok: true, reason: "no historyId" });
  }

  // 3. Resume from the last processed history id. The Pub/Sub payload
  //    only tells us "something happened at history N" — to find the
  //    actual new messages we replay history starting from the LAST
  //    one we fully processed. If we have never processed anything
  //    (fresh watch), fall back to the watch_history_id so we start
  //    from the watch checkpoint.
  const state = await getGmailWatchState();
  if (!state) {
    // No tokens row → Gmail not connected at all. Acknowledge and
    // move on; a re-auth will fix it.
    return NextResponse.json({ ok: true, reason: "no gmail token" });
  }
  const startHistoryId =
    state.lastProcessedHistoryId || state.watchHistoryId;
  if (!startHistoryId) {
    // Watch state never initialised. The user must hit
    // /api/gmail/start-watch once before push notifications can be
    // resolved. Acknowledge so Pub/Sub doesn't retry forever.
    return NextResponse.json({
      ok: true,
      reason: "watch state missing — run start-watch",
    });
  }

  // 4. Pull the history slice and the auth token for label ops.
  const { getValidAccessToken } = await import("@/lib/gmail");
  const token = await getValidAccessToken();
  const notifiedLabelId = await ensureNotifiedLabelId(token);

  // Walk every page of the history response so a busy mailbox over a
  // network blip doesn't drop tail messages.
  let pageToken: string | undefined;
  let latestHistoryId = startHistoryId;
  const processed: unknown[] = [];
  const seenMessageIds = new Set<string>();

  for (let page = 0; page < 10; page++) {
    let history;
    try {
      history = await listHistorySinceMessageAdded(startHistoryId, pageToken);
    } catch (err) {
      console.error("push-webhook: history.list failed", err);
      // Return 500 to make Pub/Sub retry. Transient Gmail-API failure
      // shouldn't burn the notification.
      return NextResponse.json(
        {
          ok: false,
          error: err instanceof Error ? err.message : "history failed",
        },
        { status: 500 },
      );
    }

    if (history.historyId) latestHistoryId = history.historyId;

    for (const record of history.history || []) {
      for (const added of record.messagesAdded || []) {
        const id = added.message?.id;
        if (!id || seenMessageIds.has(id)) continue;
        seenMessageIds.add(id);
        try {
          const outcome = await processInboundMessage(id, {
            notifiedLabelId,
            postSlack: postToSlackCustomerLove,
          });
          processed.push(outcome);
          console.log(
            `[push-webhook] ${id} → ${outcome.status}` +
              (outcome.autoReply
                ? ` autoReply=${outcome.autoReply.status}` +
                  ("reason" in outcome.autoReply && outcome.autoReply.reason
                    ? `(${outcome.autoReply.reason})`
                    : "")
                : "") +
              (outcome.reason ? ` reason=${outcome.reason}` : ""),
          );
        } catch (err) {
          console.error("push-webhook: processInboundMessage threw", err);
          processed.push({
            messageId: id,
            status: "error",
            reason: err instanceof Error ? err.message : "unknown",
          });
        }
      }
    }

    if (!history.nextPageToken) break;
    pageToken = history.nextPageToken;
  }

  // 5. Advance the cursor to the latest historyId we saw. Idempotent —
  //    the helper ignores lower values so out-of-order push retries
  //    can't rewind us.
  if (latestHistoryId) {
    try {
      await advanceLastProcessedHistoryId(latestHistoryId);
    } catch (err) {
      console.error("push-webhook: advance cursor failed", err);
    }
  }

  return NextResponse.json({ ok: true, processed });
}

async function postToSlackCustomerLove(payload: object): Promise<void> {
  // Same dedicated #customerlove webhook the old poll route used. No
  // fallback — wrong-channel notification is worse than missing one.
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
