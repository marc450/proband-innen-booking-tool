import { createAdminClient } from "@/lib/supabase/admin";

// ── Inbox sender blocklist ─────────────────────────────────────────────────
//
// The customerlove inbox is Gmail-backed, so "blocking" a sender cannot stop
// them sending. Instead, a blocked sender's inbound mail is moved to Gmail
// Spam and its Slack card + auto-reply are suppressed (see
// src/lib/gmail-inbound-processor.ts). This module is the small data layer:
// normalise addresses, check membership, and add/remove/list rows.
//
// Storage: public.blocked_senders (migration 146). pattern is stored
// lower-cased. match_type 'email' = exact address; 'domain' = bare domain
// (e.g. "spamco.com"), matched against the domain part of the sender.

export interface BlockedSender {
  id: string;
  pattern: string;
  match_type: "email" | "domain";
  reason: string | null;
  blocked_by_name: string | null;
  created_at: string;
}

/** Lower-case + trim an email address for consistent storage/lookup. */
export function normaliseEmail(raw: string): string {
  return (raw || "").trim().toLowerCase();
}

/** The bare domain of an email address, lower-cased ("a@B.com" -> "b.com").
 *  Returns "" when the input has no "@". */
export function emailDomain(raw: string): string {
  const email = normaliseEmail(raw);
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1) : "";
}

/**
 * True when `email` is blocked, either by an exact-address rule or by a
 * domain rule covering its domain. Called once per inbound message, so it is
 * a single indexed lookup on the (small) blocklist rather than loading the
 * whole table.
 */
export async function isSenderBlocked(email: string): Promise<boolean> {
  const addr = normaliseEmail(email);
  if (!addr) return false;
  const domain = emailDomain(addr);

  const admin = createAdminClient();
  // Match the exact address OR a domain rule for this sender's domain.
  const patterns = domain ? [addr, domain] : [addr];
  const { data, error } = await admin
    .from("blocked_senders")
    .select("id, pattern, match_type")
    .in("pattern", patterns)
    .limit(2);
  if (error || !data) return false;

  return data.some(
    (row) =>
      (row.match_type === "email" && row.pattern === addr) ||
      (row.match_type === "domain" && row.pattern === domain),
  );
}

/** Insert a block. Idempotent: a duplicate pattern is a no-op (returns the
 *  existing row's blocked state as ok). match_type defaults to 'email'. */
export async function blockSender(opts: {
  pattern: string;
  matchType?: "email" | "domain";
  reason?: string | null;
  blockedBy?: string | null;
  blockedByName?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const matchType = opts.matchType ?? "email";
  const pattern =
    matchType === "domain"
      ? normaliseEmail(opts.pattern).replace(/^@/, "")
      : normaliseEmail(opts.pattern);
  if (!pattern) return { ok: false, error: "Leeres Muster" };

  const admin = createAdminClient();
  const { error } = await admin.from("blocked_senders").upsert(
    {
      pattern,
      match_type: matchType,
      reason: opts.reason ?? null,
      blocked_by: opts.blockedBy ?? null,
      blocked_by_name: opts.blockedByName ?? null,
    },
    { onConflict: "pattern", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Remove a block by its pattern (exact stored value, lower-cased). */
export async function unblockSender(pattern: string): Promise<{ ok: boolean; error?: string }> {
  const value = normaliseEmail(pattern).replace(/^@/, "");
  if (!value) return { ok: false, error: "Leeres Muster" };
  const admin = createAdminClient();
  const { error } = await admin.from("blocked_senders").delete().eq("pattern", value);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** List all blocked senders, newest first, for the management UI. */
export async function listBlockedSenders(): Promise<BlockedSender[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("blocked_senders")
    .select("id, pattern, match_type, reason, blocked_by_name, created_at")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as BlockedSender[];
}
