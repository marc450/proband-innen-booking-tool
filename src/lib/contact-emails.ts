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
