import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { archiveSentMessage } from "@/lib/gmail";
import { createAdminClient } from "@/lib/supabase/admin";

// Resend → EPHIA webhook.
//
// Configured in the Resend dashboard with subscription to `email.sent`
// only. Used today for ONE thing: archiving scheduled campaign sends
// into customerlove@ephia.de's Gmail Sent folder when Resend actually
// dispatches them, so the contact-profile email history (which queries
// Gmail) shows them at the real send time. Immediate transactional
// sends archive inline in their endpoints — this webhook ignores them.
//
// Idempotency: Resend retries failed webhooks up to 16 times over 24h.
// We dedupe by inserting the message ID into archived_resend_ids with
// `on conflict do nothing` and only proceed when the insert took.

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || "";

interface ResendEventBase {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    from?: string;
    to?: string | string[];
    subject?: string;
    tags?: { name: string; value: string }[];
    headers?: { name: string; value: string }[];
  };
}

// Svix signature verification — Resend's webhook delivery uses Svix.
// Header format:
//   svix-id:        <opaque message id>
//   svix-timestamp: <unix seconds>
//   svix-signature: "v1,<base64> v1,<base64> ..."  (rotating signatures)
//
// Signed payload is `${svixId}.${svixTimestamp}.${rawBody}`. The secret
// in the dashboard starts with `whsec_` and is the base64-encoded HMAC
// key (without the prefix).
function verifySvixSignature(
  rawBody: string,
  headers: Headers,
): boolean {
  if (!RESEND_WEBHOOK_SECRET) return false;
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatureHeader = headers.get("svix-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  // Reject messages older than 5 minutes to mitigate replay attacks.
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - sentAt);
  if (ageSeconds > 300) return false;

  const secret = RESEND_WEBHOOK_SECRET.startsWith("whsec_")
    ? RESEND_WEBHOOK_SECRET.slice(6)
    : RESEND_WEBHOOK_SECRET;
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(secret, "base64");
  } catch {
    return false;
  }
  if (secretBytes.length === 0) return false;

  const signedPayload = `${id}.${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(signedPayload)
    .digest("base64");

  // svix-signature can carry multiple "v1,sig" pairs space-separated
  // during key rotation. Match any one.
  const provided = signatureHeader
    .split(" ")
    .map((part) => {
      const idx = part.indexOf(",");
      return idx >= 0 ? part.slice(idx + 1) : null;
    })
    .filter((s): s is string => s !== null && s.length > 0);

  // Constant-time compare each candidate to avoid timing attacks.
  const expectedBuf = Buffer.from(expected);
  return provided.some((sig) => {
    const sigBuf = Buffer.from(sig);
    return (
      sigBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(sigBuf, expectedBuf)
    );
  });
}

function firstEmail(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.trim() || null;
  // Resend sends the field as a comma-joined string in some shapes.
  return value.split(",")[0]?.trim() || null;
}

async function fetchResendEmail(emailId: string): Promise<{
  to: string | string[] | null;
  subject: string | null;
  html: string | null;
} | null> {
  if (!RESEND_API_KEY) return null;
  const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });
  if (!res.ok) {
    console.error(
      `resend-webhook: fetch /emails/${emailId} failed (${res.status})`,
    );
    return null;
  }
  const data = (await res.json()) as {
    to?: string | string[];
    subject?: string;
    html?: string;
  };
  return {
    to: data.to ?? null,
    subject: data.subject ?? null,
    html: data.html ?? null,
  };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifySvixSignature(rawBody, req.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: ResendEventBase;
  try {
    event = JSON.parse(rawBody) as ResendEventBase;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only `email.sent` matters for the archive flow. Everything else
  // (delivered, opened, bounced, ...) is a successful 200 noop so
  // Resend doesn't retry.
  if (event.type !== "email.sent") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  // Archive only what we explicitly tagged for it. Immediate
  // transactional sends archive inline in their endpoints; if we
  // archived them here too we'd duplicate.
  const tags = event.data.tags || [];
  const wantsArchive = tags.some(
    (t) => t.name === "ephia-archive" && t.value === "campaign-scheduled",
  );
  if (!wantsArchive) {
    return NextResponse.json({ ok: true, ignored: "no-ephia-archive-tag" });
  }

  const resendId = event.data.email_id;
  if (!resendId) {
    return NextResponse.json({ ok: true, ignored: "no-email-id" });
  }

  // Idempotency gate — return early if we've already archived this id.
  const supabase = createAdminClient();
  const { data: insertedRow, error: insertErr } = await supabase
    .from("archived_resend_ids")
    .insert({ resend_id: resendId })
    .select("resend_id")
    .maybeSingle();

  if (insertErr) {
    // Postgres unique_violation = already archived. Treat as success.
    if (insertErr.code === "23505") {
      return NextResponse.json({ ok: true, ignored: "already-archived" });
    }
    console.error("resend-webhook: dedup insert failed", insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }
  if (!insertedRow) {
    return NextResponse.json({ ok: true, ignored: "already-archived" });
  }

  // Resend's webhook payload doesn't carry the HTML body. Fetch it from
  // the message-by-id endpoint so archiveSentMessage gets the same
  // content the recipient saw.
  const email = await fetchResendEmail(resendId);
  const to = firstEmail(email?.to ?? event.data.to);
  const subject = email?.subject ?? event.data.subject ?? null;
  const html = email?.html ?? null;

  if (!to || !subject || !html) {
    console.error("resend-webhook: missing fields after fetch", {
      resendId,
      hasTo: !!to,
      hasSubject: !!subject,
      hasHtml: !!html,
    });
    return NextResponse.json(
      { error: "Could not assemble message for archive" },
      { status: 500 },
    );
  }

  try {
    await archiveSentMessage({
      to,
      subject,
      html,
      // event.created_at is ISO; align the Gmail Date header with the
      // actual Resend send time so the profile sorts correctly.
      date: new Date(event.created_at),
    });
  } catch (err) {
    console.error("resend-webhook: archiveSentMessage failed", err);
    return NextResponse.json({ error: "Archive failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, archived: resendId });
}
