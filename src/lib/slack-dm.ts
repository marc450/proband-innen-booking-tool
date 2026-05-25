/**
 * Shared Slack-DM transport for every staff-facing notification (task
 * assignments, inbox/conversation assignments, etc).
 *
 * Uses the EPHIA Slack bot (SLACK_BOT_TOKEN) + chat.postMessage with
 * the recipient's user ID as the channel. That's how Slack delivers a
 * DM: channel = user ID and the bot opens a 1:1 conversation
 * automatically. The old task notifier posted to a public channel via
 * an incoming webhook, which leaked task content to the whole team and
 * only worked when the channel was joined — DMs are correct because
 * the recipient is always exactly one person.
 *
 * Resolution order for "who do I DM":
 *  1. `slackUserId` (preferred): we already store this in
 *     `profiles.slack_user_id` for staff who completed the Slack
 *     setup. Skip the lookup round-trip when possible.
 *  2. `email` (fallback): if no Slack user ID is on file, call
 *     `users.lookupByEmail`. Mostly relevant for legacy accounts that
 *     predate the Slack-ID column.
 *
 * Failure mode is silent on purpose. Notifications must never block
 * the user-facing action that triggered them (task create, thread
 * assign, ...). Errors land in the server console for ops to chase.
 */

interface SendSlackDmOpts {
  /** Slack user ID (e.g. "U01ABC23DEF"). Preferred — skips the lookup. */
  slackUserId?: string | null;
  /** Email used for `users.lookupByEmail` when slackUserId is missing. */
  email?: string | null;
  /** mrkdwn-formatted message body. */
  text: string;
  /** Optional log prefix for debugging which caller a failure came from. */
  logTag?: string;
}

const SLACK_TOKEN_ENV = "SLACK_BOT_TOKEN";

async function resolveSlackUserId(
  token: string,
  email: string,
  logTag: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = (await res.json()) as { ok?: boolean; user?: { id?: string }; error?: string };
    if (!data.ok || !data.user?.id) {
      console.warn(`[${logTag}] users.lookupByEmail returned`, data.error ?? data);
      return null;
    }
    return data.user.id;
  } catch (err) {
    console.error(`[${logTag}] users.lookupByEmail failed:`, err);
    return null;
  }
}

/**
 * Send a DM to a single Slack user. Resolves missing user IDs via
 * email lookup when possible. Best-effort: returns silently on any
 * failure so the calling request keeps succeeding.
 */
export async function sendSlackDm(opts: SendSlackDmOpts): Promise<void> {
  const logTag = opts.logTag ?? "slack-dm";
  const token = process.env[SLACK_TOKEN_ENV];
  if (!token) {
    console.warn(`[${logTag}] ${SLACK_TOKEN_ENV} not set; skipping DM.`);
    return;
  }

  let userId = opts.slackUserId?.trim() || null;
  if (!userId && opts.email?.trim()) {
    userId = await resolveSlackUserId(token, opts.email.trim(), logTag);
  }
  if (!userId) {
    console.warn(
      `[${logTag}] No Slack user resolved (no slackUserId, no email-match). Skipping.`,
    );
    return;
  }

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel: userId, text: opts.text }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };
    if (!data.ok) {
      console.error(`[${logTag}] chat.postMessage failed:`, data.error ?? data);
    }
  } catch (err) {
    console.error(`[${logTag}] chat.postMessage threw:`, err);
  }
}
