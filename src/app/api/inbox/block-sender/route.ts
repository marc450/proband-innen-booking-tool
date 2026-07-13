import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedInbox } from "@/lib/auth-verify";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  blockSender,
  unblockSender,
  listBlockedSenders,
  normaliseEmail,
} from "@/lib/blocked-senders";
import { listThreads, modifyThreadLabels } from "@/lib/gmail";

// Inbox sender blocklist management.
//   GET                          → list blocked senders
//   POST   { email, reason? }    → block an address + sweep existing inbox
//                                  threads from it into Spam
//   DELETE { pattern }           → unblock (leaves already-spammed mail as is)
//
// Gated by requireVerifiedInbox (admin OR kursbetreuung, verified against the
// DB, never the forgeable x-user-role cookie). Enforcement of the block on
// *future* mail happens in src/lib/gmail-inbound-processor.ts; this route only
// manages the list and does the one-off retroactive sweep.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cap the retroactive sweep so a heavily-used address can't make the request
// hang. Anything beyond this stays until the next inbound mail (which the
// processor spams) or a manual trash.
const SWEEP_MAX_THREADS = 100;

export async function GET() {
  const access = await requireVerifiedInbox();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const senders = await listBlockedSenders();
  return NextResponse.json({ senders });
}

export async function POST(req: NextRequest) {
  const access = await requireVerifiedInbox();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = normaliseEmail(body.email || "");
  const reason = typeof body.reason === "string" ? body.reason.trim() || null : null;
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Ungültige E-Mail-Adresse." }, { status: 400 });
  }
  // Guard against blocking our own mailbox — that would spam every reply.
  if (email.endsWith("@ephia.de")) {
    return NextResponse.json(
      { error: "Eigene ephia.de-Adressen können nicht blockiert werden." },
      { status: 400 },
    );
  }

  // Resolve a display name for the audit list from the acting user's profile.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", access.userId)
    .single();
  const blockedByName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || null;

  const result = await blockSender({
    pattern: email,
    matchType: "email",
    reason,
    blockedBy: access.userId,
    blockedByName,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Blockieren fehlgeschlagen." }, { status: 500 });
  }

  // Retroactive sweep: move this sender's existing inbox threads to Spam so
  // the inbox is clean immediately, not just for future mail.
  let swept = 0;
  try {
    const { threads } = await listThreads({
      maxResults: SWEEP_MAX_THREADS,
      q: `from:${email} in:inbox`,
    });
    for (const t of threads) {
      try {
        await modifyThreadLabels(t.id, ["SPAM"], ["INBOX", "UNREAD"]);
        swept++;
      } catch {
        /* skip a thread that fails to move; the block itself already stands */
      }
    }
  } catch {
    /* Gmail sweep is best-effort; the block is already persisted */
  }

  return NextResponse.json({ ok: true, swept });
}

export async function DELETE(req: NextRequest) {
  const access = await requireVerifiedInbox();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const pattern = normaliseEmail(body.pattern || body.email || "");
  if (!pattern) {
    return NextResponse.json({ error: "Muster erforderlich." }, { status: 400 });
  }
  const result = await unblockSender(pattern);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Entblocken fehlgeschlagen." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
