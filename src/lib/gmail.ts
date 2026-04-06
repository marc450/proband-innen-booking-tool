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

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    redirect_uri: GMAIL_REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    login_hint: GMAIL_USER_EMAIL,
  });
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

export async function saveTokens(accessToken: string, refreshToken: string, expiresIn: number) {
  const supabase = createAdminClient();
  const expiry = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Upsert: delete old, insert new
  await supabase.from("gmail_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("gmail_tokens").insert({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry,
    email: GMAIL_USER_EMAIL,
  });
}

export async function getValidAccessToken(): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("gmail_tokens").select("*").single();
  if (!data) throw new Error("Gmail not connected. Visit /api/gmail/authorize to connect.");

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
  attachments?: EmailAttachment[]
) {
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
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: ${contentType}`,
  ];

  if (cc) rawHeaders.push(`Cc: ${cc}`);
  if (bcc) rawHeaders.push(`Bcc: ${bcc}`);
  if (inReplyTo) rawHeaders.push(`In-Reply-To: ${inReplyTo}`);
  if (references) rawHeaders.push(`References: ${references}`);

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

// Modify labels (mark read/unread, archive, etc.)
export async function modifyLabels(messageId: string, addLabels: string[] = [], removeLabels: string[] = []) {
  return gmailFetch(`messages/${messageId}/modify`, {
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
