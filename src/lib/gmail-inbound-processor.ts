import {
  getMessage,
  getHeader,
  getBody,
  extractEmailAddress,
  extractName,
  isInbound,
  modifyLabels,
  modifyThreadLabels,
} from "@/lib/gmail";
import { decodeHtmlEntities } from "@/lib/gmail-text";
import {
  sanitiseFirstName,
  sendInboxAutoReply,
} from "@/lib/inbox-auto-reply";
import { isSenderBlocked } from "@/lib/blocked-senders";

/**
 * One-message processor used by both the Pub/Sub push webhook and the
 * (legacy) 5-min polling cron. Given a Gmail messageId, this function:
 *
 *   1. Fetches the full message.
 *   2. Skips outbound / already-notified / non-inbound messages.
 *   3. Posts the Slack notification to the customerlove channel.
 *   4. Triggers the customerlove auto-reply (all anti-loop guards live
 *      inside sendInboxAutoReply).
 *   5. Tags the message with the "slack-notified" Gmail label so a
 *      second push (Pub/Sub at-least-once) is a no-op.
 *
 * The function is idempotent at the message level: the slack-notified
 * label is the dedup token for Slack, the inbox_auto_replies row is
 * the dedup token for the ACK. Either one being already in place
 * means the corresponding side-effect is skipped on retry.
 */

/** Gmail user-defined label that marks a message as already handled by
 *  the inbound processor. Both the push webhook and the legacy poll
 *  resolve this name → id once per batch and pass the id in via
 *  ProcessDeps. */
export const NOTIFIED_LABEL_NAME = "slack-notified";

export interface ProcessOutcome {
  messageId: string;
  status:
    | "notified"
    | "auto-replied"
    | "skipped-outbound"
    | "skipped-already-notified"
    | "skipped-blocked"
    | "error";
  autoReply?:
    | { status: "sent" }
    | { status: "skipped"; reason: string }
    | { status: "error"; reason: string };
  reason?: string;
}

export interface ProcessDeps {
  /** Cached label id for the "slack-notified" Gmail label. The webhook
   *  resolves this once per batch via ensureNotifiedLabelId and passes
   *  it in so we don't refetch for each message. */
  notifiedLabelId: string;
  /** POSTs the Slack message. Injected so the webhook + cron can keep
   *  their own webhook-URL handling logic without this module re-
   *  importing process.env. */
  postSlack: (payload: object) => Promise<void>;
}

export async function processInboundMessage(
  messageId: string,
  deps: ProcessDeps,
): Promise<ProcessOutcome> {
  let full;
  try {
    full = await getMessage(messageId);
  } catch (err) {
    return {
      messageId,
      status: "error",
      reason: err instanceof Error ? err.message : "fetch failed",
    };
  }

  // Idempotency gate. If we have already tagged this message with the
  // slack-notified label (either from a previous push or from the
  // legacy poll), all side-effects already ran. Push handlers can
  // re-deliver the same notification minutes later; without this
  // check we would re-Slack the same email. Gmail returns labelIds
  // as ids (e.g. "Label_123"), not names, so we compare against the
  // resolved label id the caller passed in.
  if (full.labelIds?.includes(deps.notifiedLabelId)) {
    return { messageId, status: "skipped-already-notified" };
  }

  if (!isInbound(full)) {
    // Apply the label so future pushes/polls also short-circuit.
    try {
      await modifyLabels(messageId, [deps.notifiedLabelId]);
    } catch {
      /* swallow — labelling failure is fine, we'll just re-skip next time */
    }
    return { messageId, status: "skipped-outbound" };
  }

  const fromHeader = getHeader(full, "From");
  const subject = getHeader(full, "Subject");
  const { text, html } = getBody(full);
  const preview = decodeHtmlEntities(text || html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
  const fromName = extractName(fromHeader);
  const fromEmail = extractEmailAddress(fromHeader);

  // Blocklist gate. A blocked sender's mail is moved to Gmail Spam and gets
  // no Slack card and no auto-reply. We add the slack-notified label too so a
  // re-delivery of the same push is a no-op, and remove INBOX/UNREAD so it
  // leaves the inbox view. Labelling failures are swallowed: worst case the
  // message is retried and re-spammed, which is harmless.
  if (await isSenderBlocked(fromEmail)) {
    try {
      await modifyThreadLabels(
        full.threadId,
        ["SPAM", deps.notifiedLabelId],
        ["INBOX", "UNREAD"],
      );
    } catch {
      /* swallow — see comment above */
    }
    return { messageId, status: "skipped-blocked", reason: `blocked: ${fromEmail}` };
  }

  try {
    await deps.postSlack(
      buildSlackPayload({
        fromName,
        fromEmail,
        subject,
        preview,
        threadId: full.threadId,
      }),
    );
  } catch (err) {
    return {
      messageId,
      status: "error",
      reason: `slack: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  let autoReply: ProcessOutcome["autoReply"];
  try {
    const result = await sendInboxAutoReply({
      to: fromEmail,
      firstName: sanitiseFirstName(fromName),
      threadKey: full.threadId,
      threading: {
        gmailThreadId: full.threadId,
        inReplyToMessageId: getHeader(full, "Message-ID"),
        referencesHeader: getHeader(full, "References") || undefined,
      },
      inboundHeaders: {
        autoSubmitted: getHeader(full, "Auto-Submitted"),
        precedence: getHeader(full, "Precedence"),
        listId: getHeader(full, "List-Id"),
        xAutoResponseSuppress: getHeader(full, "X-Auto-Response-Suppress"),
      },
    });
    if (result.status === "sent") {
      autoReply = { status: "sent" };
    } else if (result.status === "skipped") {
      autoReply = { status: "skipped", reason: result.reason };
    } else if (result.status === "error") {
      autoReply = { status: "error", reason: result.reason };
    }
  } catch (err) {
    autoReply = {
      status: "error",
      reason: err instanceof Error ? err.message : "auto-reply threw",
    };
  }

  // Apply the slack-notified label LAST so a failure above leaves the
  // message un-tagged and the next push retries.
  try {
    await modifyLabels(messageId, [deps.notifiedLabelId]);
  } catch (err) {
    return {
      messageId,
      status: "error",
      reason: `label: ${err instanceof Error ? err.message : "unknown"}`,
      autoReply,
    };
  }

  return {
    messageId,
    status: autoReply?.status === "sent" ? "auto-replied" : "notified",
    autoReply,
  };
}

interface SlackPayloadArgs {
  fromName: string;
  fromEmail: string;
  subject: string;
  preview: string;
  threadId: string;
}

/** Slack block kit for the customerlove inbound-notification card.
 *  Lifted verbatim from the original gmail-poll route so the look
 *  doesn't change as we move to push. */
export function buildSlackPayload(args: SlackPayloadArgs) {
  // Slack auto-links anything that looks like an email address. Wrap
  // in backticks so it renders monospace and isn't clickable (Marc's
  // preference, no mailto: links in notifications).
  const emailFormatted = `\`${args.fromEmail}\``;
  const displayFromMrkdwn = args.fromName
    ? `${args.fromName} ${emailFormatted}`
    : emailFormatted;
  const displayFromPlain = args.fromName
    ? `${args.fromName} (${args.fromEmail})`
    : args.fromEmail;
  const subjectLine = args.subject || "(kein Betreff)";
  const bodyLines = [
    `*Von:* ${displayFromMrkdwn}`,
    `*Betreff:* ${subjectLine}`,
  ];
  if (args.preview) bodyLines.push(`*Inhalt:* ${args.preview}`);
  return {
    text: `Neue E-Mail von ${displayFromPlain}`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: bodyLines.join("\n") },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Im Dashboard öffnen" },
            url: `https://admin.ephia.de/dashboard/inbox?thread=${args.threadId}`,
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
