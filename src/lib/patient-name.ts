import { createAdminClient } from "@/lib/supabase/admin";
import { hashEmail, decryptPatient } from "@/lib/encryption";

/**
 * Resolve the canonical Patient:in first name for a recipient email.
 *
 * A booking carries its own encrypted name snapshot, frozen at booking
 * time, which drifts when staff later correct the Patient:in's name in the
 * profile. The patient profile is the single source of truth, so any
 * outgoing mail should greet the Patient:in with the profile name rather
 * than whatever snapshot the caller happened to pass.
 *
 * Returns the profile first_name, or null when no patient matches the
 * address (legacy rows, typos). Callers fall back to their own value in
 * that case, so this is always safe to call.
 *
 * Server-only: uses the admin client and decrypts PII.
 */
export async function getCanonicalPatientFirstName(
  email: string,
): Promise<string | null> {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return null;

  const admin = createAdminClient();
  const emailHash = hashEmail(normalized);

  // patient_email_hashes is the multi-email lookup table; fall back to the
  // legacy patients.email_hash column for rows not yet backfilled.
  let patientId: string | null = null;
  const { data: hashRow } = await admin
    .from("patient_email_hashes")
    .select("patient_id")
    .eq("email_hash", emailHash)
    .maybeSingle();
  if (hashRow) patientId = hashRow.patient_id as string;

  if (!patientId) {
    const { data: legacy } = await admin
      .from("patients")
      .select("id")
      .eq("email_hash", emailHash)
      .limit(1)
      .maybeSingle();
    if (legacy) patientId = legacy.id as string;
  }

  if (!patientId) return null;

  const { data } = await admin
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .maybeSingle();
  if (!data) return null;

  try {
    const p = decryptPatient(data);
    return p.first_name?.trim() || null;
  } catch {
    return null;
  }
}
