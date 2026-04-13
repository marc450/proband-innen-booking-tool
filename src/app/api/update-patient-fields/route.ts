import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptFields, encryptFields, hashEmail, hashPhone } from "@/lib/encryption";

/**
 * POST /api/update-patient-fields
 * Body: { patientId: string, fields: Record<string, unknown> }
 *
 * Decrypts the patient's encrypted blob, merges in the new fields,
 * re-encrypts, and saves. Also updates email_hash / phone_hash if
 * email or phone changed.
 */
export async function POST(req: NextRequest) {
  const { patientId, fields } = await req.json();

  if (!patientId || !fields || typeof fields !== "object") {
    return NextResponse.json({ error: "patientId and fields required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("encrypted_data, encrypted_key, encryption_iv")
    .eq("id", patientId)
    .single();

  if (!patient?.encrypted_data) {
    return NextResponse.json({ error: "Patient not found or not encrypted" }, { status: 404 });
  }

  // Decrypt existing fields
  const existing = decryptFields<Record<string, unknown>>(
    patient.encrypted_data,
    patient.encrypted_key,
    patient.encryption_iv
  );

  // Merge
  for (const [key, value] of Object.entries(fields)) {
    existing[key] = value;
  }

  // Re-encrypt
  const enc = encryptFields(existing);

  // Build update payload
  const update: Record<string, unknown> = {
    encrypted_data: enc.encrypted_data,
    encrypted_key: enc.encrypted_key,
    encryption_iv: enc.encryption_iv,
  };

  // Update hashes if email or phone changed
  if ("email" in fields && typeof fields.email === "string") {
    update.email_hash = hashEmail(fields.email);
  }
  if ("phone" in fields) {
    update.phone_hash = fields.phone ? hashPhone(fields.phone as string) : null;
  }

  const { error } = await supabase
    .from("patients")
    .update(update)
    .eq("id", patientId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
