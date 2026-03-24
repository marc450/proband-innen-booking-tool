import crypto from "crypto";
import { Patient, Booking, BookingWithDetails } from "./types";

// --- Key helpers ---

function getPublicKey(): string {
  const raw = process.env.ENCRYPTION_PUBLIC_KEY || "";
  return raw.replace(/\\n/g, "\n");
}

function getPrivateKey(): string {
  const raw = process.env.ENCRYPTION_PRIVATE_KEY || "";
  return raw.replace(/\\n/g, "\n");
}

// --- Core encrypt / decrypt ---

interface EncryptedPayload {
  encrypted_data: string;
  encrypted_key: string;
  encryption_iv: string;
}

export function encryptFields(
  fields: Record<string, unknown>,
  publicKeyPem?: string
): EncryptedPayload {
  const pubKey = publicKeyPem || getPublicKey();
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
  privateKeyPem?: string
): T {
  const privKey = privateKeyPem || getPrivateKey();

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

export function hashEmail(email: string): string {
  return crypto
    .createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex");
}

export function hashPhone(phone: string): string {
  const normalized = phone.replace(/\D/g, "");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

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
      created_at: row.created_at,
      email_hash: row.email_hash ?? undefined,
    };
  }
  return { ...row, email_hash: row.email_hash ?? undefined } as Booking & { email_hash?: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decryptBookingWithDetails(row: any): BookingWithDetails & { email_hash?: string } {
  const decrypted = decryptBooking(row);
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
  });

  return {
    ...encrypted,
    email_hash: hashEmail(booking.email),
  };
}
