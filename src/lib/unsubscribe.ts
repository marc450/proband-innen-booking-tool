import { createAdminClient } from "@/lib/supabase/admin";
import { decryptPatient } from "@/lib/encryption";

/**
 * Shared opt-out logic. The composite key `p-<uuid>` / `a-<uuid>` is
 * the same scheme used in `email_campaigns.excluded_patient_ids` and
 * in the campaign-composer audience filter. UUID v4 (122 bits) makes
 * enumeration computationally infeasible, so no extra HMAC token is
 * needed.
 *
 * Opt-out is implemented as `status = 'inactive'` on the underlying
 * row (patients.patient_status or auszubildende.status). Both campaign
 * send paths already filter on this value — see
 * src/app/api/send-campaign/route.ts:103,112,138.
 *
 * Transactional emails (booking confirmation, slot changes, no-show
 * charge) do NOT filter on status, so opt-out only blocks campaigns.
 */

const KEY_RE = /^([pa])-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export type ContactKind = "p" | "a";

export interface ParsedKey {
  kind: ContactKind;
  id: string;
}

export function parseContactKey(raw: string | null | undefined): ParsedKey | null {
  if (!raw) return null;
  const match = KEY_RE.exec(raw.trim());
  if (!match) return null;
  return { kind: match[1].toLowerCase() as ContactKind, id: match[2].toLowerCase() };
}

export interface ContactSnapshot {
  firstName: string | null;
  email: string | null;
  status: string | null;
  unsubscribedAt: string | null;
}

/**
 * Look up the contact behind a parsed key. Returns null for unknown
 * IDs. Patient PII is encrypted, so we decrypt before returning the
 * first name for the confirmation screen.
 */
export async function loadContact(key: ParsedKey): Promise<ContactSnapshot | null> {
  const supabase = createAdminClient();

  if (key.kind === "p") {
    const { data } = await supabase
      .from("patients")
      .select("*")
      .eq("id", key.id)
      .maybeSingle();
    if (!data) return null;
    const decrypted = decryptPatient(data);
    return {
      firstName: decrypted.first_name ?? null,
      email: decrypted.email ?? null,
      status: data.patient_status ?? null,
      unsubscribedAt: data.unsubscribed_at ?? null,
    };
  }

  // kind === "a"
  const { data } = await supabase
    .from("auszubildende")
    .select("id, first_name, status, unsubscribed_at")
    .eq("id", key.id)
    .maybeSingle();
  if (!data) return null;
  // Auszubildende email lives in auszubildende_emails; for the confirm
  // screen we only need first_name, so skip the join.
  return {
    firstName: data.first_name ?? null,
    email: null,
    status: data.status ?? null,
    unsubscribedAt: data.unsubscribed_at ?? null,
  };
}

/**
 * Idempotent opt-out. Returns true on success (including if already
 * inactive). Errors only on DB failure.
 */
export async function applyOptOut(key: ParsedKey): Promise<boolean> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  if (key.kind === "p") {
    const { error } = await supabase
      .from("patients")
      .update({ patient_status: "inactive", unsubscribed_at: now })
      .eq("id", key.id);
    return !error;
  }

  const { error } = await supabase
    .from("auszubildende")
    .update({ status: "inactive", unsubscribed_at: now })
    .eq("id", key.id);
  return !error;
}

/**
 * Re-subscribe a contact who used the opt-out link by accident. Only
 * flips status back to 'active' when the row is currently 'inactive'
 * AND was set so via the opt-out flow (unsubscribed_at IS NOT NULL).
 * That way we never accidentally reactivate someone Marc manually
 * deactivated for unrelated reasons (warning escalations, etc.).
 */
export async function applyResubscribe(key: ParsedKey): Promise<boolean> {
  const supabase = createAdminClient();

  if (key.kind === "p") {
    const { error } = await supabase
      .from("patients")
      .update({ patient_status: "active", unsubscribed_at: null })
      .eq("id", key.id)
      .eq("patient_status", "inactive")
      .not("unsubscribed_at", "is", null);
    return !error;
  }

  const { error } = await supabase
    .from("auszubildende")
    .update({ status: "active", unsubscribed_at: null })
    .eq("id", key.id)
    .eq("status", "inactive")
    .not("unsubscribed_at", "is", null);
  return !error;
}
