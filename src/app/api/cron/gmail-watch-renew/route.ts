import { NextRequest, NextResponse } from "next/server";
import {
  saveGmailWatchState,
  startGmailWatch,
} from "@/lib/gmail";

/**
 * Daily renewal for the Gmail push watch. Gmail watches expire after
 * at most 7 days, so we re-register every 24 hours to keep the push
 * pipeline alive comfortably ahead of expiry.
 *
 * Called by the Railway customerlove-cron service. The same secret
 * pattern as the legacy /api/cron/gmail-poll: Bearer token in the
 * Authorization header, verified against CRON_SECRET.
 *
 * users.watch is idempotent — calling it daily with the same topic
 * just rolls the watch forward. The new historyId we get back resets
 * last_processed_history_id so the next push notification has a fresh
 * resume point.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topic = process.env.GMAIL_PUBSUB_TOPIC;
  if (!topic) {
    return NextResponse.json(
      { ok: false, reason: "GMAIL_PUBSUB_TOPIC not configured" },
      { status: 200 },
    );
  }

  try {
    const result = await startGmailWatch(topic);
    const expirationMs = Number(result.expiration);
    const expirationIso = Number.isFinite(expirationMs)
      ? new Date(expirationMs).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await saveGmailWatchState({
      watchHistoryId: result.historyId,
      watchExpiration: expirationIso,
    });
    return NextResponse.json({
      ok: true,
      historyId: result.historyId,
      expiration: expirationIso,
    });
  } catch (err) {
    console.error("gmail-watch-renew failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "Failed to renew watch",
      },
      // 200 keeps the Railway cron service "ready" — a failure here
      // doesn't deserve a container-level alarm; the next-day attempt
      // will retry. We surface the failure in the response body so
      // logs are still useful.
      { status: 200 },
    );
  }
}
