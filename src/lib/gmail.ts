// Gmail API client — OAuth 2.0 with refresh token stored in Supabase
import { createAdminClient } from "@/lib/supabase/admin";

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID!;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!;
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI!;
const GMAIL_USER_EMAIL = process.env.GMAIL_USER_EMAIL || "customerlove@ephia.de";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
];

// ── OAuth helpers ──

// loginHint pre-fills the Google account picker. state is opaque round-trip
// data (we use it to remember which EPHIA mailbox the consent was for, so
// the callback knows under which email to upsert the resulting tokens).
export function getAuthUrl(opts?: { loginHint?: string; state?: string }): string {
  const params = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    redirect_uri: GMAIL_REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    login_hint: opts?.loginHint ?? GMAIL_USER_EMAIL,
  });
  if (opts?.state) params.set("state", opts.state);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      redirect_uri: GMAIL_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }
  return res.json();
}

// ── Token management ──

// Multi-account aware. `email` defaults to GMAIL_USER_EMAIL (customerlove)
// so all existing single-account callers stay backward compatible.
export async function saveTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  email: string = GMAIL_USER_EMAIL,
) {
  const supabase = createAdminClient();
  const expiry = new Date(Date.now() + expiresIn * 1000).toISOString();

  await supabase.from("gmail_tokens").upsert(
    {
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry,
      email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );
}

export async function getValidAccessToken(email: string = GMAIL_USER_EMAIL): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("gmail_tokens")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (!data) throw new Error(`Gmail not connected for ${email}. Visit /api/gmail/authorize to connect.`);

  // If token expires in less than 5 minutes, refresh
  if (new Date(data.expiry).getTime() - Date.now() < 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(data.refresh_token);
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await supabase
      .from("gmail_tokens")
      .update({ access_token: refreshed.access_token, expiry: newExpiry, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    return refreshed.access_token;
  }

  return data.access_token;
}

// ── Gmail API calls ──

async function gmailFetch(path: string, options?: RequestInit) {
  const token = await getValidAccessToken();
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
    throw new Error(`Gmail API error (${res.status}): ${err}`);
  }
  return res.json();
}

export interface GmailThread {
  id: string;
  snippet: string;
  historyId: string;
  messages: GmailMessage[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: string;
  payload: {
    headers: { name: string; value: string }[];
    mimeType: string;
    body?: { data?: string; size: number };
    parts?: GmailPart[];
  };
}

interface GmailPart {
  mimeType: string;
  filename?: string;
  body?: { data?: string; size: number; attachmentId?: string };
  parts?: GmailPart[];
}

// List threads (paginated)
export async function listThreads(options: {
  maxResults?: number;
  pageToken?: string;
  q?: string;
}): Promise<{ threads: { id: string; snippet: string; historyId: string }[]; nextPageToken?: string; resultSizeEstimate: number }> {
  const params = new URLSearchParams();
  if (options.maxResults) params.set("maxResults", String(options.maxResults));
  if (options.pageToken) params.set("pageToken", options.pageToken);
  if (options.q) params.set("q", options.q);
  const data = await gmailFetch(`threads?${params}`);
  return { threads: data.threads || [], nextPageToken: data.nextPageToken, resultSizeEstimate: data.resultSizeEstimate || 0 };
}

// Get full thread with messages
export async function getThread(threadId: string): Promise<GmailThread> {
  return gmailFetch(`threads/${threadId}?format=full`);
}

// Move a thread to Gmail Trash. Reversible from within Gmail for 30 days.
export async function trashThread(threadId: string): Promise<void> {
  await gmailFetch(`threads/${threadId}/trash`, { method: "POST" });
}

// Get a single message
export async function getMessage(messageId: string): Promise<GmailMessage> {
  return gmailFetch(`messages/${messageId}?format=full`);
}

// Download attachment by ID
export async function downloadAttachment(messageId: string, attachmentId: string): Promise<{ data: string; size: number }> {
  return gmailFetch(`messages/${messageId}/attachments/${attachmentId}`);
}

// Extract attachment metadata from message parts
export interface AttachmentMeta {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

export function getAttachments(message: GmailMessage): AttachmentMeta[] {
  const attachments: AttachmentMeta[] = [];

  function walk(parts?: GmailPart[]) {
    if (!parts) return;
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId,
        });
      }
      if (part.parts) walk(part.parts);
    }
  }

  walk(message.payload.parts);
  return attachments;
}

// Send email (with optional attachments)
export interface EmailAttachment {
  filename: string;
  mimeType: string;
  content: string; // base64 encoded
}

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  inReplyTo?: string,
  references?: string,
  threadId?: string,
  cc?: string,
  bcc?: string,
  attachments?: EmailAttachment[],
  sentBy?: string,
  /** Optional extra raw headers to add to the outgoing MIME message.
   *  Used by the inbox auto-reply to set RFC 3834 markers
   *  (Auto-Submitted: auto-replied, Precedence: bulk) so that other
   *  mail servers can recognise our ACK as machine-generated and not
   *  bounce it back at us. Keys are header names, values are raw
   *  header values (no CRLF). */
  extraHeaders?: Record<string, string>,
) {
  // RFC 2047: encode header values that contain non-ASCII characters
  const encodeHeader = (value: string): string => {
    // eslint-disable-next-line no-control-regex
    if (/^[\x00-\x7F]*$/.test(value)) return value; // pure ASCII, no encoding needed
    return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
  };

  const fromHeader = `EPHIA <${GMAIL_USER_EMAIL}>`;
  const hasAttachments = attachments && attachments.length > 0;

  const outerBoundary = `boundary_${Date.now()}`;
  const innerBoundary = `inner_${Date.now()}`;

  const contentType = hasAttachments
    ? `multipart/mixed; boundary="${outerBoundary}"`
    : `multipart/alternative; boundary="${outerBoundary}"`;

  let rawHeaders = [
    `From: ${fromHeader}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: ${contentType}`,
  ];

  if (cc) rawHeaders.push(`Cc: ${cc}`);
  if (bcc) rawHeaders.push(`Bcc: ${bcc}`);
  if (sentBy) rawHeaders.push(`X-EPHIA-Sent-By: ${sentBy}`);
  if (inReplyTo) rawHeaders.push(`In-Reply-To: ${inReplyTo}`);
  if (references) rawHeaders.push(`References: ${references}`);
  if (extraHeaders) {
    for (const [name, value] of Object.entries(extraHeaders)) {
      // Strip CR/LF so a caller can't smuggle additional headers into
      // the message via the value. Header names are trusted because
      // they come from server-side call sites.
      const safeValue = value.replace(/[\r\n]+/g, " ").trim();
      if (safeValue) rawHeaders.push(`${name}: ${safeValue}`);
    }
  }

  const parts: string[] = [rawHeaders.join("\r\n"), ""];

  if (hasAttachments) {
    // multipart/mixed: inner alternative for HTML, then attachment parts
    parts.push(`--${outerBoundary}`);
    parts.push(`Content-Type: multipart/alternative; boundary="${innerBoundary}"`);
    parts.push("");
    parts.push(`--${innerBoundary}`);
    parts.push("Content-Type: text/html; charset=UTF-8");
    parts.push("Content-Transfer-Encoding: base64");
    parts.push("");
    parts.push(Buffer.from(htmlBody).toString("base64"));
    parts.push(`--${innerBoundary}--`);

    for (const att of attachments!) {
      parts.push(`--${outerBoundary}`);
      parts.push(`Content-Type: ${att.mimeType}; name="${att.filename}"`);
      parts.push(`Content-Disposition: attachment; filename="${att.filename}"`);
      parts.push("Content-Transfer-Encoding: base64");
      parts.push("");
      parts.push(att.content);
    }
    parts.push(`--${outerBoundary}--`);
  } else {
    // Simple multipart/alternative (no attachments)
    parts.push(`--${outerBoundary}`);
    parts.push("Content-Type: text/html; charset=UTF-8");
    parts.push("Content-Transfer-Encoding: base64");
    parts.push("");
    parts.push(Buffer.from(htmlBody).toString("base64"));
    parts.push(`--${outerBoundary}--`);
  }

  const rawBody = parts.join("\r\n");

  const encodedMessage = Buffer.from(rawBody)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const body: Record<string, string> = { raw: encodedMessage };
  if (threadId) body.threadId = threadId;

  return gmailFetch("messages/send", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Mirror an email that was already sent via Resend into the
 * customerlove@ephia.de Gmail Sent folder. Uses users.messages.insert
 * with labelIds=["SENT"] and internalDateSource=dateHeader so contact-
 * profile email histories (which query Gmail) pick the message up as
 * an outbound thread instead of missing it entirely.
 *
 * Best-effort by design: callers should wrap in try/catch — a Gmail
 * outage or token issue must never break the underlying Resend send.
 */
export async function archiveSentMessage(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; mimeType: string; content: string }[];
  date?: Date;
}): Promise<void> {
  const { to, subject, html, attachments, date = new Date() } = opts;

  const encodeHeader = (value: string): string => {
    // eslint-disable-next-line no-control-regex
    if (/^[\x00-\x7F]*$/.test(value)) return value;
    return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
  };

  const fromHeader = `EPHIA <${GMAIL_USER_EMAIL}>`;
  const hasAttachments = !!attachments?.length;
  const outerBoundary = `boundary_${Date.now()}`;
  const innerBoundary = `inner_${Date.now()}`;
  const contentType = hasAttachments
    ? `multipart/mixed; boundary="${outerBoundary}"`
    : `multipart/alternative; boundary="${outerBoundary}"`;

  const rawHeaders = [
    `From: ${fromHeader}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${date.toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: ${contentType}`,
  ];

  const parts: string[] = [rawHeaders.join("\r\n"), ""];

  if (hasAttachments) {
    parts.push(`--${outerBoundary}`);
    parts.push(`Content-Type: multipart/alternative; boundary="${innerBoundary}"`);
    parts.push("");
    parts.push(`--${innerBoundary}`);
    parts.push("Content-Type: text/html; charset=UTF-8");
    parts.push("Content-Transfer-Encoding: base64");
    parts.push("");
    parts.push(Buffer.from(html).toString("base64"));
    parts.push(`--${innerBoundary}--`);

    for (const att of attachments!) {
      parts.push(`--${outerBoundary}`);
      parts.push(`Content-Type: ${att.mimeType}; name="${att.filename}"`);
      parts.push(`Content-Disposition: attachment; filename="${att.filename}"`);
      parts.push("Content-Transfer-Encoding: base64");
      parts.push("");
      parts.push(att.content);
    }
    parts.push(`--${outerBoundary}--`);
  } else {
    parts.push(`--${outerBoundary}`);
    parts.push("Content-Type: text/html; charset=UTF-8");
    parts.push("Content-Transfer-Encoding: base64");
    parts.push("");
    parts.push(Buffer.from(html).toString("base64"));
    parts.push(`--${outerBoundary}--`);
  }

  const rawBody = parts.join("\r\n");
  const encodedMessage = Buffer.from(rawBody)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const inserted = (await gmailFetch("messages?internalDateSource=dateHeader", {
    method: "POST",
    body: JSON.stringify({
      raw: encodedMessage,
      labelIds: ["SENT"],
    }),
  })) as { id?: string };

  // Gmail's insert pipeline ignores the lack of INBOX in labelIds and
  // still applies INBOX/UNREAD/IMPORTANT to inserted messages, which
  // pollutes the customerlove inbox with copies of every transactional
  // send. Strip those labels immediately so the message only lives in
  // Sent. Best-effort: a failure here is logged but doesn't fail the
  // archive operation as a whole.
  if (inserted.id) {
    try {
      await gmailFetch(`messages/${inserted.id}/modify`, {
        method: "POST",
        body: JSON.stringify({
          removeLabelIds: ["INBOX", "UNREAD", "IMPORTANT"],
        }),
      });
    } catch (err) {
      console.error("archiveSentMessage: label cleanup failed", err);
    }
  }
}

// ── Push Notifications (Gmail Watch + Pub/Sub) ──

export interface GmailWatchResponse {
  /** Snapshot historyId at the moment of the watch call. Used as the
   *  startHistoryId for the very first history.list call that follows
   *  this watch. */
  historyId: string;
  /** Expiration time as a unix-millis string. Watches last at most 7
   *  days, so we renew daily. */
  expiration: string;
}

/** Register a Gmail push watch on the INBOX label. Gmail will then
 *  publish a notification to `topicName` every time a new message
 *  arrives. The returned historyId is the watch checkpoint and must
 *  be persisted before any push notification is processed. */
export async function startGmailWatch(
  topicName: string,
): Promise<GmailWatchResponse> {
  return gmailFetch("watch", {
    method: "POST",
    body: JSON.stringify({
      topicName,
      labelIds: ["INBOX"],
      // labelFilterAction default is "include" → only fire for the
      // labels we listed, i.e. real INBOX arrivals. Spam-only mail
      // never triggers a notification, which is exactly what we want.
    }),
  }) as Promise<GmailWatchResponse>;
}

/** Stop the active Gmail watch. Use to cleanly tear down before
 *  reconnecting / when rotating Pub/Sub topics. */
export async function stopGmailWatch(): Promise<void> {
  await gmailFetch("stop", { method: "POST" });
}

interface GmailHistoryRecord {
  id: string;
  messages?: { id: string; threadId: string }[];
  messagesAdded?: {
    message: { id: string; threadId: string; labelIds?: string[] };
  }[];
}

export interface GmailHistoryList {
  history?: GmailHistoryRecord[];
  /** Latest historyId in the response. Push handlers store this so
   *  the next call can resume from here. */
  historyId: string;
  nextPageToken?: string;
}

/** List Gmail history records since `startHistoryId`. We filter to
 *  `messageAdded` records because we only care about new arrivals.
 *  The history API surfaces every change since the checkpoint
 *  (labels, deletes, drafts, …) — restricting to messageAdded keeps
 *  the response small and the call cheap. */
export async function listHistorySinceMessageAdded(
  startHistoryId: string,
  pageToken?: string,
): Promise<GmailHistoryList> {
  const params = new URLSearchParams({
    startHistoryId,
    historyTypes: "messageAdded",
    labelId: "INBOX",
  });
  if (pageToken) params.set("pageToken", pageToken);
  return gmailFetch(`history?${params}`) as Promise<GmailHistoryList>;
}

/** Read the persisted Gmail-watch state for the customerlove inbox.
 *  Used by the push webhook to know where to resume from and by the
 *  renewal cron to decide whether the current watch is close to
 *  expiring. */
export async function getGmailWatchState(
  email: string = GMAIL_USER_EMAIL,
): Promise<{
  watchHistoryId: string | null;
  watchExpiration: string | null;
  lastProcessedHistoryId: string | null;
} | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("gmail_tokens")
    .select(
      "watch_history_id, watch_expiration, last_processed_history_id",
    )
    .eq("email", email)
    .maybeSingle();
  if (!data) return null;
  return {
    watchHistoryId: data.watch_history_id ?? null,
    watchExpiration: data.watch_expiration ?? null,
    lastProcessedHistoryId: data.last_processed_history_id ?? null,
  };
}

/** Persist the watch checkpoint after a successful users.watch call.
 *  We also reset last_processed_history_id to the new watch_history_id
 *  so the next push notification's history.list call starts from a
 *  valid resume point. */
export async function saveGmailWatchState(opts: {
  email?: string;
  watchHistoryId: string;
  watchExpiration: string;
}): Promise<void> {
  const email = opts.email ?? GMAIL_USER_EMAIL;
  const supabase = createAdminClient();
  await supabase
    .from("gmail_tokens")
    .update({
      watch_history_id: opts.watchHistoryId,
      watch_expiration: opts.watchExpiration,
      last_processed_history_id: opts.watchHistoryId,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email);
}

/** Advance the resume cursor after a push notification finishes
 *  processing. Idempotent: a smaller historyId is silently ignored
 *  so out-of-order Pub/Sub retries can't rewind us. */
export async function advanceLastProcessedHistoryId(
  newHistoryId: string,
  email: string = GMAIL_USER_EMAIL,
): Promise<void> {
  const supabase = createAdminClient();
  const { data: current } = await supabase
    .from("gmail_tokens")
    .select("last_processed_history_id")
    .eq("email", email)
    .maybeSingle();
  const currentId = BigInt(current?.last_processed_history_id || "0");
  const candidate = BigInt(newHistoryId || "0");
  if (candidate <= currentId) return;
  await supabase
    .from("gmail_tokens")
    .update({
      last_processed_history_id: newHistoryId,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email);
}

// Modify labels (mark read/unread, archive, etc.)
export async function modifyLabels(messageId: string, addLabels: string[] = [], removeLabels: string[] = []) {
  return gmailFetch(`messages/${messageId}/modify`, {
    method: "POST",
    body: JSON.stringify({ addLabelIds: addLabels, removeLabelIds: removeLabels }),
  });
}

// Apply/remove labels across every message in a thread in one call. Used to
// move a blocked sender's thread to Spam (add "SPAM", remove "INBOX"). "SPAM"
// and "INBOX" are Gmail system-label ids and can be used directly.
export async function modifyThreadLabels(threadId: string, addLabels: string[] = [], removeLabels: string[] = []) {
  return gmailFetch(`threads/${threadId}/modify`, {
    method: "POST",
    body: JSON.stringify({ addLabelIds: addLabels, removeLabelIds: removeLabels }),
  });
}

// ── Helpers ──

export function getHeader(message: GmailMessage, name: string): string {
  return message.payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

export function extractEmailAddress(headerValue: string): string {
  const match = headerValue.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : headerValue.toLowerCase().trim();
}

export function extractName(headerValue: string): string {
  const match = headerValue.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : "";
}

export function getBody(message: GmailMessage): { html: string; text: string } {
  let html = "";
  let text = "";

  function extractParts(parts?: GmailPart[]) {
    if (!parts) return;
    for (const part of parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        html = Buffer.from(part.body.data, "base64url").toString("utf-8");
      } else if (part.mimeType === "text/plain" && part.body?.data) {
        text = Buffer.from(part.body.data, "base64url").toString("utf-8");
      } else if (part.parts) {
        extractParts(part.parts);
      }
    }
  }

  // Single-part message
  if (message.payload.body?.data) {
    if (message.payload.mimeType === "text/html") {
      html = Buffer.from(message.payload.body.data, "base64url").toString("utf-8");
    } else {
      text = Buffer.from(message.payload.body.data, "base64url").toString("utf-8");
    }
  }

  // Multi-part message
  extractParts(message.payload.parts);

  return { html, text };
}

export function isInbound(message: GmailMessage): boolean {
  const from = extractEmailAddress(getHeader(message, "From"));
  return from !== GMAIL_USER_EMAIL;
}

// True for the automated customerlove acknowledgement we send back to a
// contact on inbound (see lib/inbox-auto-reply.ts, header stamped on send).
// These are outbound by From-address but are NOT a human reply, so the
// inbox "Beantwortet" logic must ignore them when deciding whether a
// thread still needs an answer.
export function isAutoReply(message: GmailMessage): boolean {
  return !!getHeader(message, "X-EPHIA-Auto-Reply");
}
