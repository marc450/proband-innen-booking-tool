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

// Centralised "upsert by email" for the contact table. Replaces the
// scattered `.upsert({...}, { onConflict: "email" })` pattern, which
// only sees the legacy `auszubildende.email` column and would miss a
// contact whose primary was changed via the multi-email manager. This
// helper looks up by alias first (so aliases also resolve back to the
// canonical contact), updates the existing row when found, otherwise
// inserts a new contact. The 046 sync trigger handles seeding the
// alias row on insert; we never touch is_primary here.
//
// `fields.email` is ignored on update (the primary email is owned by
// setAuszubildendePrimary). On insert it's used to seed the legacy
// column so the trigger can mirror it into auszubildende_emails.
export async function upsertAuszubildendeByEmail(
  email: string,
  fields: Record<string, unknown>,
): Promise<string | null> {
  const admin = createAdminClient();
  const lower = email.trim().toLowerCase();
  if (!lower) return null;

  const existingId = await findAuszubildendeIdByAnyEmail(lower);

  if (existingId) {
    const { email: _ignore, ...updateFields } = fields;
    void _ignore;
    if (Object.keys(updateFields).length > 0) {
      await admin.from("auszubildende").update(updateFields).eq("id", existingId);
    }
    return existingId;
  }

  const { data, error } = await admin
    .from("auszubildende")
    .insert({ ...fields, email: lower })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

// Promote one auszubildende_emails row to primary, demote the previous
// primary, and sync the legacy auszubildende.email column. Two sequential
// updates: the partial unique index allows the brief window where neither
// row is primary, and any failure between steps leaves the contact with
// no primary which is recoverable on next write.
export async function setAuszubildendePrimary(
  contactId: string,
  emailRowId: string,
  newPrimaryEmail: string,
): Promise<void> {
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
  await admin
    .from("auszubildende")
    .update({ email: newPrimaryEmail })
    .eq("id", contactId);
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
