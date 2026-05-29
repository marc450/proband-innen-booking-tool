import crypto from "node:crypto";
import { sendEmail } from "@/lib/gmail";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Customerlove inbox auto-reply ("Vielen Dank für Deine Nachricht…").
 *
 * Two trigger paths share this module:
 *   1. `/api/contact-message` calls `sendInboxAutoReply` right after it
 *      posts the internal notification to customerlove@. We know the
 *      sender's first name + email from the form payload, so we pass
 *      a synthetic `threadKey` ("contact-form:<hash>:<yyyy-mm-dd>") so
 *      multiple submissions on the same day still dedupe.
 *   2. `/api/cron/gmail-poll` calls `sendInboxAutoReply` for every new
 *      inbound message in the customerlove inbox. The Gmail `threadId`
 *      drives the dedup, so a long back-and-forth gets exactly one ACK.
 *
 * All anti-loop guards (RFC 3834 headers, bounce addresses, internal
 * senders, dedup) live in this file. Both call sites only hand over
 * what they know and let the shared function decide.
 */

const AUTO_REPLY_SUBJECT = "Wir haben Deine Nachricht erhalten";

// Local domain we never auto-reply to (staff, ourselves, system aliases).
// Anything @ephia.de is treated as internal.
const INTERNAL_DOMAIN = "ephia.de";

// Sender local-parts that should never receive an auto-reply because
// the address is itself a machine and will either bounce, loop, or
// just clutter their queue. RFC 3834 §5 recommends this kind of list
// as a complement to header-based detection.
const SYSTEM_LOCALPART_PATTERNS: RegExp[] = [
  /^mailer-daemon(\+.*)?$/i,
  /^postmaster(\+.*)?$/i,
  /^no-?reply(\+.*)?$/i,
  /^do-?not-?reply(\+.*)?$/i,
  /^bounces?(\+.*)?$/i,
  /^abuse(\+.*)?$/i,
];

/** Outcome of an auto-reply decision. `sent` means we actually called
 *  Gmail; everything else is a no-op we surface to callers (the cron
 *  surfaces these in its return payload, the contact-form ignores them).
 */
export type AutoReplyResult =
  | { status: "sent"; threadKey: string }
  | { status: "skipped"; reason: AutoReplySkipReason; threadKey: string }
  | { status: "error"; reason: string; threadKey: string };

export type AutoReplySkipReason =
  | "internal-sender"
  | "system-sender"
  | "auto-submitted"
  | "precedence-bulk"
  | "list-mail"
  | "x-auto-response-suppress"
  | "already-sent"
  | "missing-recipient";

interface SendInboxAutoReplyOpts {
  /** Recipient email (the original sender we want to ACK). */
  to: string;
  /** First name for the salutation. Falls back to no name if missing. */
  firstName?: string | null;
  /** Stable dedup key. For Gmail-poll, use the Gmail `threadId`. For
   *  the contact form, the helper `contactFormThreadKey` builds one
   *  from email + day so same-day duplicate submissions don't trigger
   *  two ACKs. */
  threadKey: string;
  /** Optional: Gmail thread metadata for proper email threading. When
   *  set, the ACK lands inside the original Gmail thread (recipient
   *  sees it nicely stacked under their message; staff sees it inline
   *  in the admin inbox). */
  threading?: {
    gmailThreadId: string;
    inReplyToMessageId: string;
    referencesHeader?: string;
  };
  /** Header bag from the inbound message (Gmail-poll path only). Used
   *  for RFC 3834 / RFC 5230 loop-prevention checks. Pass an empty
   *  object when the caller has no headers (contact form). */
  inboundHeaders?: {
    autoSubmitted?: string;
    precedence?: string;
    listId?: string;
    xAutoResponseSuppress?: string;
  };
}

export async function sendInboxAutoReply(
  opts: SendInboxAutoReplyOpts,
): Promise<AutoReplyResult> {
  const { to, firstName, threadKey, threading, inboundHeaders } = opts;
  const recipient = (to || "").trim().toLowerCase();
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return { status: "skipped", reason: "missing-recipient", threadKey };
  }

  const [localPart, domain] = recipient.split("@");

  // Hard-skip 1: internal staff / ourselves. customerlove@ephia.de is
  // both the sender and (occasionally) a recipient via aliasing, so the
  // domain check covers Marc, Sophia, contact-form rebroadcasts, and
  // anything else we operate.
  if (domain === INTERNAL_DOMAIN) {
    return { status: "skipped", reason: "internal-sender", threadKey };
  }

  // Hard-skip 2: system mailboxes. Auto-replying to a bounce notice
  // creates a real bounce loop on some mail servers.
  if (SYSTEM_LOCALPART_PATTERNS.some((re) => re.test(localPart))) {
    return { status: "skipped", reason: "system-sender", threadKey };
  }

  // Hard-skip 3: RFC 3834 / RFC 2076 / Microsoft headers. The original
  // sender already announced "I am a machine" or "I'm bulk mail" —
  // replying produces a loop and irritates real users.
  const headers = inboundHeaders || {};
  const autoSubmitted = (headers.autoSubmitted || "").trim().toLowerCase();
  if (autoSubmitted && !autoSubmitted.startsWith("no")) {
    return { status: "skipped", reason: "auto-submitted", threadKey };
  }
  const precedence = (headers.precedence || "").trim().toLowerCase();
  if (
    precedence === "bulk" ||
    precedence === "list" ||
    precedence === "junk"
  ) {
    return { status: "skipped", reason: "precedence-bulk", threadKey };
  }
  if ((headers.listId || "").trim()) {
    return { status: "skipped", reason: "list-mail", threadKey };
  }
  if ((headers.xAutoResponseSuppress || "").trim()) {
    return {
      status: "skipped",
      reason: "x-auto-response-suppress",
      threadKey,
    };
  }

  // Dedup: try to claim the threadKey row. If it already exists, another
  // poll/submission beat us to it and we just skip silently.
  const supabase = createAdminClient();
  const { error: insertErr } = await supabase
    .from("inbox_auto_replies")
    .insert({ thread_id: threadKey, recipient_email: recipient });
  if (insertErr) {
    // Postgres unique-violation = "already sent". Any other DB error
    // we surface as `error` so the cron logs it.
    const isDuplicate =
      (insertErr.code || "") === "23505" ||
      /duplicate key/i.test(insertErr.message || "");
    if (isDuplicate) {
      return { status: "skipped", reason: "already-sent", threadKey };
    }
    return {
      status: "error",
      reason: `dedup insert: ${insertErr.message || insertErr.code}`,
      threadKey,
    };
  }

  // From here on, we're committed to sending. If the Gmail call fails
  // the row stays — better to drop one ACK than to send two.
  const html = buildAutoReplyHtml({ firstName });
  try {
    await sendEmail(
      recipient,
      AUTO_REPLY_SUBJECT,
      html,
      threading?.inReplyToMessageId,
      threading?.referencesHeader,
      threading?.gmailThreadId,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        // RFC 3834 §5: marks the message as a machine-generated reply
        // so downstream auto-responders don't ping back.
        "Auto-Submitted": "auto-replied",
        // RFC 2076: hint to legacy MTAs and Outlook OOO logic.
        Precedence: "bulk",
        // Microsoft Exchange honours this to stop their own OOO from
        // replying to us.
        "X-Auto-Response-Suppress": "All",
        // Marker we own so we can spot our own auto-replies later if
        // we ever need to filter them out of analytics.
        "X-EPHIA-Auto-Reply": "customerlove-inbox-ack-v1",
      },
    );
    return { status: "sent", threadKey };
  } catch (err) {
    return {
      status: "error",
      reason: err instanceof Error ? err.message : "send failed",
      threadKey,
    };
  }
}

/** Build the synthetic dedup key for the contact-form path. The Gmail
 *  thread doesn't exist yet at this point, so we use a stable hash of
 *  the recipient email + the current calendar day (Europe/Berlin) so
 *  two submissions in quick succession dedupe but a new day starts
 *  fresh.
 */
export function contactFormThreadKey(email: string): string {
  const normalized = email.trim().toLowerCase();
  const day = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Europe/Berlin",
  }); // sv-SE → yyyy-mm-dd
  const hash = crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex")
    .slice(0, 16);
  return `contact-form:${hash}:${day}`;
}

/** Sanitise an arbitrary first-name candidate so it's safe to drop into
 *  the email salutation. Strips control characters, trims, drops if it
 *  doesn't look like a plausible name. Returns undefined if the input
 *  is unusable, which falls back to the no-name salutation. */
export function sanitiseFirstName(
  raw: string | null | undefined,
): string | undefined {
  if (!raw) return undefined;
  // Drop angle-bracket / colon-laced strings (they tend to be raw From
  // headers that slipped through). Allow letters, marks, hyphen,
  // apostrophe, spaces.
  const trimmed = raw
    .trim()
    .replace(/\s+/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F<>]/g, "");
  if (!trimmed) return undefined;
  // Take the first word only — recipients rarely react well to long
  // run-on greetings ("Hi Dr. Anna Maria,"). 60 chars hard cap.
  const firstWord = trimmed.split(" ")[0].slice(0, 60);
  if (firstWord.length < 2) return undefined;
  return firstWord;
}

interface AutoReplyHtmlOpts {
  firstName?: string | null;
}

export function buildAutoReplyHtml(opts: AutoReplyHtmlOpts): string {
  const clean = sanitiseFirstName(opts.firstName);
  const greeting = clean ? `Hi ${escapeHtml(clean)},` : "Hi,";
  // No fancy CTA, no banner image — the auto-reply has to read like a
  // short personal note, not a marketing email. Single white card on
  // light grey, system / Arial font stack to match what the rest of the
  // inbox uses. No dashes anywhere in the copy (BRAND_MANUAL rule).
  return `<!doctype html>
<html lang="de">
  <body style="margin:0; padding:0; background:#f6f6f6; font-family:Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width:560px; margin:0 auto; padding:24px;">
      <div style="background:#ffffff; border-radius:10px; padding:28px; color:#222; font-size:15px; line-height:1.55;">
        <p style="margin:0 0 14px;">${greeting}</p>
        <p style="margin:0 0 14px;">vielen Dank für Deine Nachricht. Wir haben sie erhalten und melden uns innerhalb von 24 Stunden bei Dir.</p>
        <p style="margin:0 0 14px;">Am Wochenende und an Feiertagen kann es etwas länger dauern. Spätestens am nächsten Werktag hörst Du von uns.</p>
        <p style="margin:18px 0 0;">Liebe Grüße<br>Dein EPHIA Team</p>
      </div>
      <p style="text-align:center; color:#999; font-size:11px; margin-top:14px;">
        Diese Nachricht wurde automatisch verschickt. Eine persönliche Antwort folgt.
      </p>
    </div>
  </body>
</html>`;
}

export const AUTO_REPLY_SUBJECT_LINE = AUTO_REPLY_SUBJECT;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
