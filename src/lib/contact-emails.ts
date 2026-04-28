import { createAdminClient } from "@/lib/supabase/admin";

// Server-side helpers for the multi-email manager. Live in /lib so the
// API routes can import them without crossing the route.ts boundary
// (Next.js conventions discourage non-handler exports from route files).

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
