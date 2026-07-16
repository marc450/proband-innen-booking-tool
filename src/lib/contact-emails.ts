import { createAdminClient } from "@/lib/supabase/admin";
import { hashEmail } from "@/lib/encryption";

// Server-side helpers for the multi-email manager. Live in /lib so the
// API routes can import them without crossing the route.ts boundary
// (Next.js conventions discourage non-handler exports from route files).

// Resolve any patient email (primary OR alias) to its patient_id. Hits
// the new patient_email_hashes table first, falls back to the legacy
// patients.email_hash column. Returns null when no patient owns that
// address.
//
// Booking flows (confirm-booking, create-private-booking,
// check-booking-eligibility) should always look patients up via this
// helper rather than querying patients.email_hash directly. The legacy
// column only contains the primary email, so a patient who books with
// an alias would be invisible and we'd either bypass blacklist or
// create a duplicate patient profile.
export async function findPatientIdByAnyEmail(
  email: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const hash = hashEmail(email);

  const { data: alias } = await admin
    .from("patient_email_hashes")
    .select("patient_id")
    .eq("email_hash", hash)
    .maybeSingle();
  if (alias) return alias.patient_id as string;

  const { data: legacy } = await admin
    .from("patients")
    .select("id")
    .eq("email_hash", hash)
    .maybeSingle();
  return (legacy?.id as string | undefined) ?? null;
}

// Resolve any auszubildende email (primary OR alias) to its contact id.
// Mirrors findPatientIdByAnyEmail: alias table first, legacy column as
// fallback for any contact that pre-dates the 046 sync trigger and was
// never touched since.
export async function findAuszubildendeIdByAnyEmail(
  email: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const lower = email.trim().toLowerCase();
  if (!lower) return null;

  const { data: alias } = await admin
    .from("auszubildende_emails")
    .select("auszubildende_id")
    .eq("email", lower)
    .maybeSingle();
  if (alias) return alias.auszubildende_id as string;

  const { data: legacy } = await admin
    .from("v_auszubildende")
    .select("id")
    .ilike("email", lower)
    .maybeSingle();
  return (legacy?.id as string | undefined) ?? null;
}

// Centralised "upsert by email" for the contact table. Resolves the
// contact via auszubildende_emails (alias OR primary), updating an
// existing row by id when found and otherwise inserting a fresh
// auszubildende plus a primary alias. fields.email is always ignored:
// the primary is owned by auszubildende_emails.
export async function upsertAuszubildendeByEmail(
  email: string,
  fields: Record<string, unknown>,
  source: string = "auto",
): Promise<string | null> {
  const admin = createAdminClient();
  const lower = email.trim().toLowerCase();
  if (!lower) return null;

  const existingId = await findAuszubildendeIdByAnyEmail(lower);

  const { email: _ignoredEmail, ...cleanFields } = fields;
  void _ignoredEmail;

  if (existingId) {
    if (Object.keys(cleanFields).length > 0) {
      await admin.from("auszubildende").update(cleanFields).eq("id", existingId);
    }
    return existingId;
  }

  const { data, error } = await admin
    .from("auszubildende")
    .insert(cleanFields)
    .select("id")
    .single();
  if (error || !data) return null;

  const newId = data.id as string;
  await admin.from("auszubildende_emails").insert({
    auszubildende_id: newId,
    email: lower,
    is_primary: true,
    source,
  });
  return newId;
}

// Find-or-create the alias row for the given email on the given contact,
// then promote it to primary. Wraps the find/insert/setAuszubildendePrimary
// dance shared by the dashboard email editor, the LW restore tool, and
// any other "set primary email by address" caller.
export async function setPrimaryEmailForAuszubildende(
  contactId: string,
  email: string,
  source: string = "manual",
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const admin = createAdminClient();
  const lower = email.trim().toLowerCase();
  if (!lower) {
    return { ok: false, error: "E-Mail darf nicht leer sein.", status: 400 };
  }

  const { data: existingAlias } = await admin
    .from("auszubildende_emails")
    .select("id, auszubildende_id")
    .eq("email", lower)
    .maybeSingle();

  if (existingAlias && existingAlias.auszubildende_id !== contactId) {
    return {
      ok: false,
      error: "Diese E-Mail ist bereits einer anderen Person zugeordnet.",
      status: 409,
    };
  }

  let aliasRowId: string;
  if (existingAlias) {
    aliasRowId = existingAlias.id as string;
  } else {
    const { data: inserted, error: insertError } = await admin
      .from("auszubildende_emails")
      .insert({
        auszubildende_id: contactId,
        email: lower,
        is_primary: false,
        source,
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      return {
        ok: false,
        error: insertError?.message || "Insert failed.",
        status: 500,
      };
    }
    aliasRowId = inserted.id as string;
  }

  await setAuszubildendePrimary(contactId, aliasRowId, lower);
  return { ok: true };
}

// Promote one auszubildende_emails row to primary, demote the previous
// primary. Two sequential updates: the partial unique index allows the
// brief window where neither row is primary, and any failure between
// steps leaves the contact with no primary which is recoverable on
// next write. The third parameter is kept for caller-facing clarity
// only; the canonical primary email lives in auszubildende_emails.email.
export async function setAuszubildendePrimary(
  contactId: string,
  emailRowId: string,
  newPrimaryEmail: string,
): Promise<void> {
  void newPrimaryEmail;
  const admin = createAdminClient();
  await admin
    .from("auszubildende_emails")
    .update({ is_primary: false })
    .eq("auszubildende_id", contactId)
    .eq("is_primary", true);
  await admin
    .from("auszubildende_emails")
    .update({ is_primary: true })
    .eq("id", emailRowId);
}

// Same shape for patients: promote, demote, sync legacy email_hash. The
// patients.encrypted_data field still contains the old primary email
// inside its blob; updating that requires decrypt-merge-encrypt and is
// intentionally deferred — primary lookup uses email_hash which we sync
// here.
export async function setPatientPrimary(
  patientId: string,
  emailRowId: string,
  newPrimaryEmailHash: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("patient_email_hashes")
    .update({ is_primary: false })
    .eq("patient_id", patientId)
    .eq("is_primary", true);
  await admin
    .from("patient_email_hashes")
    .update({ is_primary: true })
    .eq("id", emailRowId);
  await admin
    .from("patients")
    .update({ email_hash: newPrimaryEmailHash })
    .eq("id", patientId);
}
