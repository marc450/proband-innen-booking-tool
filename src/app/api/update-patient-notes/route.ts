import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptFields, encryptFields } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  const { patientId, notes } = await req.json();

  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
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

  // Decrypt, merge notes, re-encrypt
  const fields = decryptFields<Record<string, unknown>>(
    patient.encrypted_data,
    patient.encrypted_key,
    patient.encryption_iv
  );

  fields.notes = notes || null;

  const enc = encryptFields(fields);

  const { error } = await supabase
    .from("patients")
    .update({
      encrypted_data: enc.encrypted_data,
      encrypted_key: enc.encrypted_key,
      encryption_iv: enc.encryption_iv,
    })
    .eq("id", patientId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
