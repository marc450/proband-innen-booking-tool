import { createAdminClient } from "@/lib/supabase/admin";
import { hashEmail, decryptPatient } from "@/lib/encryption";
import { formatPersonName } from "@/lib/utils";

/**
 * Batch-resolve contact display names from email addresses.
 *
 * The inbox thread list pulls `contactName` out of the Gmail `From`
 * header, which is often bare (just the email, no display name). When
 * the contact already exists in our DB we know the real name; this
 * helper fills that gap so the thread list shows "Natascha Beer"
 * instead of "nasti2004@web.de".
 *
 * Two passes:
 *  1. `auszubildende_emails` (plaintext, single roundtrip).
 *  2. `patients` via email_hash (E2EE, decrypts only matched rows).
 *
 * The result is a Map keyed by lowercase-trimmed email. Callers should
 * normalise their lookup key the same way.
 */
export async function resolveContactNamesByEmail(
  emails: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (emails.length === 0) return result;

  const normalised = Array.from(
    new Set(
      emails
        .map((e) => e?.trim().toLowerCase())
        .filter((e): e is string => !!e && e.includes("@")),
    ),
  );
  if (normalised.length === 0) return result;

  const admin = createAdminClient();

  // ── Pass 1: auszubildende (plaintext) ─────────────────────────────
  const { data: emailRows } = await admin
    .from("auszubildende_emails")
    .select("email, auszubildende_id")
    .in("email", normalised);

  if (emailRows && emailRows.length > 0) {
    const idByEmail = new Map<string, string>();
    for (const row of emailRows) {
      const e = (row.email as string | null)?.toLowerCase();
      const id = row.auszubildende_id as string | null;
      if (e && id) idByEmail.set(e, id);
    }
    const ids = Array.from(new Set(idByEmail.values()));
    if (ids.length > 0) {
      const { data: persons } = await admin
        .from("auszubildende")
        .select("id, title, first_name, last_name")
        .in("id", ids);
      const nameById = new Map<string, string>();
      for (const p of persons ?? []) {
        const name = formatPersonName({
          title: (p.title as string | null) ?? null,
          firstName: (p.first_name as string | null) ?? null,
          lastName: (p.last_name as string | null) ?? null,
        });
        if (name) nameById.set(p.id as string, name);
      }
      for (const [email, id] of idByEmail.entries()) {
        const n = nameById.get(id);
        if (n) result.set(email, n);
      }
    }
  }

  // ── Pass 2: patients (E2EE) for emails still unresolved ───────────
  const stillMissing = normalised.filter((e) => !result.has(e));
  if (stillMissing.length > 0) {
    const emailByHash = new Map<string, string>();
    for (const e of stillMissing) {
      emailByHash.set(hashEmail(e), e);
    }
    const hashes = Array.from(emailByHash.keys());
    const { data: pats } = await admin
      .from("patients")
      .select(
        "email_hash, encrypted_data, encrypted_key, encryption_iv, first_name, last_name",
      )
      .in("email_hash", hashes);
    for (const p of pats ?? []) {
      try {
        const decrypted = decryptPatient(
          p as Parameters<typeof decryptPatient>[0],
        );
        const hash = p.email_hash as string | null;
        const email = hash ? emailByHash.get(hash) : null;
        if (!email) continue;
        const name = formatPersonName({
          firstName: decrypted.first_name,
          lastName: decrypted.last_name,
        });
        if (name) result.set(email, name);
      } catch {
        // Best-effort: legacy or malformed rows are skipped silently.
        // The thread list will fall back to the From-header name or
        // the bare email, which is the prior behaviour anyway.
      }
    }
  }

  return result;
}
