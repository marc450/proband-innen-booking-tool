import crypto from "crypto";
import { Patient, Booking, BookingWithDetails } from "./types";

// --- Key helpers ---
// Keys are cached as parsed KeyObjects — PEM is parsed only once per process lifetime.

let _cachedPrivateKey: crypto.KeyObject | null = null;
let _cachedPublicKey: crypto.KeyObject | null = null;

function getPublicKey(): crypto.KeyObject {
  if (!_cachedPublicKey) {
    const raw = (process.env.ENCRYPTION_PUBLIC_KEY || "").replace(/\\n/g, "\n");
    _cachedPublicKey = crypto.createPublicKey(raw);
  }
  return _cachedPublicKey;
}

function getPrivateKey(): crypto.KeyObject {
  if (!_cachedPrivateKey) {
    const raw = (process.env.ENCRYPTION_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    _cachedPrivateKey = crypto.createPrivateKey(raw);
  }
  return _cachedPrivateKey;
}

// --- Core encrypt / decrypt ---

interface EncryptedPayload {
  encrypted_data: string;
  encrypted_key: string;
  encryption_iv: string;
}

export function encryptFields(
  fields: Record<string, unknown>,
  publicKeyOverride?: crypto.KeyObject | string
): EncryptedPayload {
  const pubKey = publicKeyOverride ?? getPublicKey();
  const plaintext = JSON.stringify(fields);

  // Generate random AES-256 key (DEK) and IV
  const dek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  // Encrypt data with AES-256-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", dek, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Combine ciphertext + auth tag
  const combined = Buffer.concat([encrypted, authTag]);

  // Encrypt the DEK with RSA-OAEP
  const encryptedDek = crypto.publicEncrypt(
    { key: pubKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    dek
  );

  return {
    encrypted_data: combined.toString("base64"),
    encrypted_key: encryptedDek.toString("base64"),
    encryption_iv: iv.toString("base64"),
  };
}

export function decryptFields<T = Record<string, unknown>>(
  encrypted_data: string,
  encrypted_key: string,
  encryption_iv: string,
  privateKeyOverride?: crypto.KeyObject | string
): T {
  const privKey = privateKeyOverride ?? getPrivateKey();

  // Decrypt the DEK
  const dek = crypto.privateDecrypt(
    { key: privKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    Buffer.from(encrypted_key, "base64")
  );

  const iv = Buffer.from(encryption_iv, "base64");
  const combined = Buffer.from(encrypted_data, "base64");

  // Split ciphertext and auth tag (last 16 bytes)
  const ciphertext = combined.subarray(0, combined.length - 16);
  const authTag = combined.subarray(combined.length - 16);

  const decipher = crypto.createDecipheriv("aes-256-gcm", dek, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8")) as T;
}

// --- Hashing ---

// email_hash / phone_hash are deterministic so dedup and blacklist lookups can
// find a person without decrypting anything. They used to be plain SHA-256,
// which is reversible for low-entropy inputs: every German mobile number can be
// hashed in minutes, and a suspected email can be confirmed instantly. That
// defeated the E2EE for those two fields if the database ever leaked.
//
// They are now HMAC-SHA256 keyed with a server-only pepper: still deterministic
// (lookups behave identically), but not precomputable or brute-forceable
// without the key. HASH_PEPPER must be set before this code runs, and must
// never change once data is hashed with it (changing it means re-running the
// backfill). See docs/hmac-hash-migration-runbook.md.

function pepper(): string {
  const p = process.env.HASH_PEPPER;
  if (!p) {
    // Fail fast and loudly. Falling back to the old unsalted hash here would
    // silently write hashes that no lookup can find, corrupting dedup and
    // letting blacklisted people through.
    throw new Error("HASH_PEPPER is not set — refusing to hash.");
  }
  return p;
}

// Normalisation stays byte-identical to the legacy scheme so the backfill
// recomputes the same logical value from decrypted plaintext.
function normalizeEmailForHash(email: string): string {
  return email.toLowerCase().trim();
}

function normalizePhoneForHash(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function hashEmail(email: string): string {
  return crypto
    .createHmac("sha256", pepper())
    .update(normalizeEmailForHash(email))
    .digest("hex");
}

export function hashPhone(phone: string): string {
  return crypto
    .createHmac("sha256", pepper())
    .update(normalizePhoneForHash(phone))
    .digest("hex");
}

// The migration to HMAC is complete: every email_hash / phone_hash row was
// backfilled and verified (545 patients, 274 bookings, 519 patient_email_hashes,
// 0 failures), so the transition-only legacyHash*/`*Candidates` helpers and the
// dual-read lookups they fed are gone. Hashing is HMAC-only from here.
//
// Do NOT reintroduce a plain SHA-256 hash of an email or phone: those inputs
// are low-entropy, so an unkeyed digest is reversible for phone numbers and
// confirmable for emails by anyone holding a database dump, which is exactly
// the E2EE gap this closed.

// --- Patient helpers ---

interface PatientEncryptedFields {
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  stripe_customer_id: string | null;
  notes: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decryptPatient(row: any): Patient {
  if (row.encrypted_data && row.encrypted_key && row.encryption_iv) {
    const fields = decryptFields<PatientEncryptedFields>(
      row.encrypted_data,
      row.encrypted_key,
      row.encryption_iv
    );
    return {
      id: row.id,
      email: fields.email || row.email || "",
      first_name: fields.first_name ?? row.first_name ?? null,
      last_name: fields.last_name ?? row.last_name ?? null,
      phone: fields.phone ?? row.phone ?? null,
      address_street: fields.address_street ?? row.address_street ?? null,
      address_zip: fields.address_zip ?? row.address_zip ?? null,
      address_city: fields.address_city ?? row.address_city ?? null,
      stripe_customer_id: fields.stripe_customer_id ?? row.stripe_customer_id ?? null,
      patient_status: row.patient_status,
      notes: fields.notes ?? row.notes ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
  // Fallback: unencrypted row (during migration period)
  return row as Patient;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decryptBooking(row: any): Booking & { email_hash?: string } {
  if (row.encrypted_data && row.encrypted_key && row.encryption_iv) {
    const fields = decryptFields<{
      name: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
      phone: string | null;
      address_street: string | null;
      address_zip: string | null;
      address_city: string | null;
      stripe_customer_id: string | null;
      stripe_payment_method_id: string | null;
      notes: string | null;
    }>(row.encrypted_data, row.encrypted_key, row.encryption_iv);

    return {
      id: row.id,
      slot_id: row.slot_id,
      name: fields.name || row.name || "",
      first_name: fields.first_name ?? row.first_name ?? null,
      last_name: fields.last_name ?? row.last_name ?? null,
      email: fields.email || row.email || "",
      phone: fields.phone ?? row.phone ?? null,
      address_street: fields.address_street ?? row.address_street ?? null,
      address_zip: fields.address_zip ?? row.address_zip ?? null,
      address_city: fields.address_city ?? row.address_city ?? null,
      stripe_customer_id: fields.stripe_customer_id ?? row.stripe_customer_id ?? null,
      stripe_payment_method_id: fields.stripe_payment_method_id ?? row.stripe_payment_method_id ?? null,
      stripe_checkout_session_id: row.stripe_checkout_session_id,
      status: row.status,
      charge_id: row.charge_id,
      patient_id: row.patient_id ?? null,
      booking_type: row.booking_type ?? undefined,
      referring_doctor: row.referring_doctor ?? undefined,
      indication: row.indication ?? null,
      notes: fields.notes ?? row.notes ?? null,
      created_at: row.created_at,
      email_hash: row.email_hash ?? undefined,
    };
  }
  return { ...row, email_hash: row.email_hash ?? undefined } as Booking & { email_hash?: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decryptBookingWithDetails(row: any): BookingWithDetails & { email_hash?: string } {
  const decrypted = decryptBooking(row);

  // When the booking is linked to a patient and the join provided that
  // patient row (alias `patient`, see the dashboard/bookings query), use
  // the patient's name as the source of truth. The booking row keeps its
  // own encrypted name snapshot from the time of booking — that snapshot
  // can drift if the patient is later corrected (a previously-imported
  // booking might still carry "DKB" while the patient profile already
  // reads "Ute Böcker"). Falling back to the booking snapshot keeps
  // legacy bookings without `patient_id` working.
  if (row.patient) {
    const patient = decryptPatient(row.patient);
    const firstName = patient.first_name ?? decrypted.first_name;
    const lastName = patient.last_name ?? decrypted.last_name;
    return {
      ...decrypted,
      first_name: firstName,
      last_name: lastName,
      name:
        firstName && lastName
          ? `${firstName} ${lastName}`
          : decrypted.name,
      slots: row.slots,
    } as BookingWithDetails & { email_hash?: string };
  }

  return {
    ...decrypted,
    slots: row.slots,
  } as BookingWithDetails & { email_hash?: string };
}

export function encryptPatientFields(patient: {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  address_street?: string | null;
  address_zip?: string | null;
  address_city?: string | null;
  stripe_customer_id?: string | null;
  notes?: string | null;
}): EncryptedPayload & { email_hash: string; phone_hash: string | null } {
  const encrypted = encryptFields({
    email: patient.email,
    first_name: patient.first_name || null,
    last_name: patient.last_name || null,
    phone: patient.phone || null,
    address_street: patient.address_street || null,
    address_zip: patient.address_zip || null,
    address_city: patient.address_city || null,
    stripe_customer_id: patient.stripe_customer_id || null,
    notes: patient.notes || null,
  });

  return {
    ...encrypted,
    email_hash: hashEmail(patient.email),
    phone_hash: patient.phone ? hashPhone(patient.phone) : null,
  };
}

export function encryptBookingFields(booking: {
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  address_street?: string | null;
  address_zip?: string | null;
  address_city?: string | null;
  stripe_customer_id?: string | null;
  stripe_payment_method_id?: string | null;
  notes?: string | null;
}): EncryptedPayload & { email_hash: string } {
  const encrypted = encryptFields({
    name: booking.name,
    first_name: booking.first_name || null,
    last_name: booking.last_name || null,
    email: booking.email,
    phone: booking.phone || null,
    address_street: booking.address_street || null,
    address_zip: booking.address_zip || null,
    address_city: booking.address_city || null,
    stripe_customer_id: booking.stripe_customer_id || null,
    stripe_payment_method_id: booking.stripe_payment_method_id || null,
    notes: booking.notes || null,
  });

  return {
    ...encrypted,
    email_hash: hashEmail(booking.email),
  };
}
