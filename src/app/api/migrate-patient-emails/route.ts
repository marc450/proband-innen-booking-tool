import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedAdmin } from "@/lib/auth-verify";
import {
  decryptFields,
  encryptFields,
  hashEmail,
} from "@/lib/encryption";

// One-shot backfill for patient_email_hashes (migration 044). Decrypts each
// patient's email out of `patients.encrypted_data`, encrypts it freshly into
// the new per-email row, and inserts with `is_primary = true`.
//
// Idempotent: patients that already have at least one row in
// patient_email_hashes are skipped, so re-running after a partial failure is
// safe.
//
// Auth: staff session required. Run by hitting POST /api/migrate-patient-emails
// once from the dashboard after migration 044 has been applied.

export async function POST() {
  // Admin-only. This decrypts every patient's email out of E2EE storage,
  // so it must never be reachable by a public 'student' account. Verified
  // gate (validates the JWT + reads the role from the DB), not the
  // forgeable x-user-role cookie or a bare getUser() existence check.
  const access = await requireVerifiedAdmin();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const admin = createAdminClient();

  let processed = 0;
  let inserted = 0;
  let skippedAlreadyDone = 0;
  let skippedNoEmail = 0;
  let failed = 0;
  const errors: Array<{ patient_id: string; reason: string }> = [];

  const { data: patients, error: listErr } = await admin
    .from("patients")
    .select("id, encrypted_data, encrypted_key, encryption_iv");

  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }
  if (!patients) {
    return NextResponse.json({ ok: true, processed: 0, inserted: 0 });
  }

  for (const p of patients) {
    processed++;

    const { data: existing } = await admin
      .from("patient_email_hashes")
      .select("id")
      .eq("patient_id", p.id)
      .limit(1)
      .maybeSingle();
    if (existing) {
      skippedAlreadyDone++;
      continue;
    }

    if (!p.encrypted_data || !p.encrypted_key || !p.encryption_iv) {
      skippedNoEmail++;
      continue;
    }

    let email: string | null = null;
    try {
      const fields = decryptFields<{ email?: string }>(
        p.encrypted_data as string,
        p.encrypted_key as string,
        p.encryption_iv as string,
      );
      email = (fields.email || "").trim().toLowerCase() || null;
    } catch (err) {
      failed++;
      errors.push({
        patient_id: p.id as string,
        reason: `decrypt failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    if (!email) {
      skippedNoEmail++;
      continue;
    }

    let enc;
    try {
      enc = encryptFields({ email });
    } catch (err) {
      failed++;
      errors.push({
        patient_id: p.id as string,
        reason: `encrypt failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    const { error: insErr } = await admin
      .from("patient_email_hashes")
      .insert({
        patient_id: p.id,
        email_hash: hashEmail(email),
        encrypted_email: enc.encrypted_data,
        encrypted_key: enc.encrypted_key,
        encryption_iv: enc.encryption_iv,
        is_primary: true,
        source: "backfill",
      });

    if (insErr) {
      // Most likely cause: another patient already registered the same
      // email (UNIQUE on email_hash). Surface but keep going.
      failed++;
      errors.push({ patient_id: p.id as string, reason: insErr.message });
      continue;
    }

    inserted++;
  }

  return NextResponse.json({
    ok: true,
    processed,
    inserted,
    skippedAlreadyDone,
    skippedNoEmail,
    failed,
    errors: errors.slice(0, 50),
  });
}
