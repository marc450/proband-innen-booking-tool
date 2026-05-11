import { normalizeEmail } from "@/lib/email-normalize";

// Build a Set of normalised patient emails from a list of (decrypted)
// patient rows. Use this to detect contacts that are listed in the
// auszubildende table BUT are actually Proband:innen — they should be
// excluded from the Ärzt:innen-only audience.
//
// Reported case: "Lydia Lemke" appeared under the Ärzt:innen filter in
// the campaign composer even though she's a Probandin. Root cause: a
// stray row in v_auszubildende with the same email as her patients
// row. Email is the cross-table identity key, so dedup-by-email is the
// most reliable filter we can apply without a schema change.
export function buildPatientEmailSet(
  patients: Array<{ email: string | null | undefined }>,
): Set<string> {
  const set = new Set<string>();
  for (const p of patients) {
    if (!p.email) continue;
    const key = normalizeEmail(p.email);
    if (key) set.add(key);
  }
  return set;
}

// True when this auszubildende row's email overlaps with a known
// Probandin email. Centralised so the UI page loaders, the send
// pipeline, and any future audience-aware screen all use the same
// definition of "this row is actually a patient".
export function isAlsoAPatient(
  azubi: { email: string | null | undefined },
  patientEmails: Set<string>,
): boolean {
  if (!azubi.email) return false;
  const key = normalizeEmail(azubi.email);
  return key.length > 0 && patientEmails.has(key);
}
