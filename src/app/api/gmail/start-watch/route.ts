import { NextResponse } from "next/server";
import { requireVerifiedAdmin } from "@/lib/auth-verify";
import {
  saveGmailWatchState,
  startGmailWatch,
} from "@/lib/gmail";

/**
 * POST /api/gmail/start-watch — register a Gmail INBOX push watch on the
 * configured Pub/Sub topic and persist the resulting checkpoint to
 * gmail_tokens. Admin-only.
 *
 * Call this once after the Google Cloud setup (topic + push subscription)
 * is in place, then again any time the watch is lost (e.g. after a
 * re-auth that invalidates the previous watch). The daily renewal cron
 * /api/cron/gmail-watch-renew calls the same underlying helper, so this
 * route is mostly for first-time bootstrap and manual recovery.
 */
export async function POST() {
  // Verified-admin gate (validates the session, never the forgeable
  // x-user-role cookie the previous isAdmin() check trusted).
  if (!(await requireVerifiedAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const topic = process.env.GMAIL_PUBSUB_TOPIC;
  if (!topic) {
    return NextResponse.json(
      { error: "GMAIL_PUBSUB_TOPIC not configured" },
      { status: 500 },
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
    console.error("start-watch failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to start Gmail watch",
      },
      { status: 500 },
    );
  }
}
