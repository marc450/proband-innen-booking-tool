import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedAdmin } from "@/lib/auth-verify";
import {
  decryptFields,
  decryptPatient,
  decryptBooking,
  hashEmail,
  hashPhone,
} from "@/lib/encryption";

// Step 3 of docs/hmac-hash-migration-runbook.md.
//
// Rewrites email_hash / phone_hash from the old unsalted SHA-256 to the keyed
// HMAC. The new hash can only be derived from the plaintext, so each row is
// decrypted from its own encrypted source and re-hashed.
//
// SAFETY PROPERTIES
//  - Only ever UPDATEs the two hash columns. It never writes encrypted_data /
//    encrypted_key / encryption_iv, so the irreplaceable PII cannot be damaged
//    by this script. Worst case it writes a wrong hash, which a re-run fixes.
//  - Idempotent and self-correcting: for every row it recomputes the expected
//    HMAC from the plaintext and skips the row if the stored hash already
//    matches. Re-running after a partial failure is safe and cheap.
//  - Safe to run while the app serves traffic: lookups dual-read both hash
//    forms until the Step 5 cleanup, so a half-migrated table still resolves.
//  - Requires HASH_PEPPER. We probe it up front and abort rather than
//    half-processing.
//
// Auth: verified admin only. This decrypts every patient's email and phone.
// Run once via POST /api/migrate-hash-hmac after HASH_PEPPER is set and the
// Step 0b hash backup has been taken.

const PAGE = 500;

interface StoreResult {
  scanned: number;
  updated: number;
  alreadyDone: number;
  skippedNoValue: number;
  failed: number;
}

function emptyResult(): StoreResult {
  return { scanned: 0, updated: 0, alreadyDone: 0, skippedNoValue: 0, failed: 0 };
}

type Admin = ReturnType<typeof createAdminClient>;

export async function POST() {
  const access = await requireVerifiedAdmin();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Abort before touching anything if the pepper is missing.
  try {
    hashEmail("probe@example.com");
  } catch {
    return NextResponse.json(
      { error: "HASH_PEPPER is not set — aborting before any write." },
      { status: 500 },
    );
  }

  const admin = createAdminClient();

  const patients = await backfillPatients(admin);
  const bookings = await backfillBookings(admin);
  const patientEmailHashes = await backfillPatientEmailHashes(admin);

  const summary = { patients, bookings, patient_email_hashes: patientEmailHashes };
  console.log("migrate-hash-hmac finished:", JSON.stringify(summary));
  return NextResponse.json({ ok: true, ...summary });
}

// patients: email_hash + phone_hash, source is the row's encrypted blob
// (decryptPatient falls back to legacy plaintext columns when a row predates
// encryption, which is exactly what we want to hash).
async function backfillPatients(admin: Admin): Promise<StoreResult> {
  const res = emptyResult();

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("patients")
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("migrate-hash-hmac: patients page failed:", error);
      res.failed += 1;
      break;
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      res.scanned += 1;
      let email: string | null = null;
      let phone: string | null = null;
      try {
        const p = decryptPatient(row);
        email = p.email ?? null;
        phone = p.phone ?? null;
      } catch (err) {
        console.error(`migrate-hash-hmac: patient ${row.id} decrypt failed:`, err);
        res.failed += 1;
        continue;
      }

      const update: Record<string, string> = {};
      if (email) {
        const want = hashEmail(email);
        if (row.email_hash !== want) update.email_hash = want;
      }
      if (phone) {
        const want = hashPhone(phone);
        if (row.phone_hash !== want) update.phone_hash = want;
      }

      if (!email && !phone) {
        res.skippedNoValue += 1;
        continue;
      }
      if (Object.keys(update).length === 0) {
        res.alreadyDone += 1;
        continue;
      }

      const { error: updErr } = await admin
        .from("patients")
        .update(update)
        .eq("id", row.id);
      if (updErr) {
        console.error(`migrate-hash-hmac: patient ${row.id} update failed:`, updErr);
        res.failed += 1;
      } else {
        res.updated += 1;
      }
    }

    if (data.length < PAGE) break;
  }

  return res;
}

// bookings: email_hash ONLY. phone_hash exists on `patients` (migration 007)
// but was never added to `bookings` — encryptBookingFields returns just
// email_hash. Do not touch phone_hash here; the column does not exist.
async function backfillBookings(admin: Admin): Promise<StoreResult> {
  const res = emptyResult();

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("bookings")
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("migrate-hash-hmac: bookings page failed:", error);
      res.failed += 1;
      break;
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      res.scanned += 1;
      let email: string | null = null;
      try {
        const b = decryptBooking(row);
        email = b.email ?? null;
      } catch (err) {
        console.error(`migrate-hash-hmac: booking ${row.id} decrypt failed:`, err);
        res.failed += 1;
        continue;
      }

      if (!email) {
        res.skippedNoValue += 1;
        continue;
      }

      const want = hashEmail(email);
      if (row.email_hash === want) {
        res.alreadyDone += 1;
        continue;
      }

      const { error: updErr } = await admin
        .from("bookings")
        .update({ email_hash: want })
        .eq("id", row.id);
      if (updErr) {
        console.error(`migrate-hash-hmac: booking ${row.id} update failed:`, updErr);
        res.failed += 1;
      } else {
        res.updated += 1;
      }
    }

    if (data.length < PAGE) break;
  }

  return res;
}

// patient_email_hashes: email_hash only. Each row carries its own
// encrypted_email (encryptFields({ email })), so it re-hashes standalone.
async function backfillPatientEmailHashes(admin: Admin): Promise<StoreResult> {
  const res = emptyResult();

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("patient_email_hashes")
      .select("id, email_hash, encrypted_email, encrypted_key, encryption_iv")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("migrate-hash-hmac: patient_email_hashes page failed:", error);
      res.failed += 1;
      break;
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      res.scanned += 1;

      if (!row.encrypted_email || !row.encrypted_key || !row.encryption_iv) {
        res.skippedNoValue += 1;
        continue;
      }

      let email: string | null = null;
      try {
        const fields = decryptFields<{ email?: string }>(
          row.encrypted_email,
          row.encrypted_key,
          row.encryption_iv,
        );
        email = fields.email ?? null;
      } catch (err) {
        console.error(
          `migrate-hash-hmac: patient_email_hashes ${row.id} decrypt failed:`,
          err,
        );
        res.failed += 1;
        continue;
      }

      if (!email) {
        res.skippedNoValue += 1;
        continue;
      }

      const want = hashEmail(email);
      if (row.email_hash === want) {
        res.alreadyDone += 1;
        continue;
      }

      const { error: updErr } = await admin
        .from("patient_email_hashes")
        .update({ email_hash: want })
        .eq("id", row.id);
      if (updErr) {
        console.error(
          `migrate-hash-hmac: patient_email_hashes ${row.id} update failed:`,
          updErr,
        );
        res.failed += 1;
      } else {
        res.updated += 1;
      }
    }

    if (data.length < PAGE) break;
  }

  return res;
}
