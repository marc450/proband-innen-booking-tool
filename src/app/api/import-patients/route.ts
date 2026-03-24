import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PatientStatus } from "@/lib/types";
import { encryptPatientFields, hashEmail } from "@/lib/encryption";

interface ImportRow {
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  patient_status: PatientStatus;
}

export async function POST(req: NextRequest) {
  const rows: ImportRow[] = await req.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No data" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch existing email hashes to detect duplicates
  const { data: existing } = await supabase
    .from("patients")
    .select("email_hash");

  const existingHashes = new Set((existing || []).map((p) => p.email_hash));

  const toInsert = rows.filter((r) => !existingHashes.has(hashEmail(r.email)));
  const skipped = rows.length - toInsert.length;

  if (toInsert.length === 0) {
    return NextResponse.json({ inserted: 0, skipped });
  }

  // Encrypt each row before inserting
  const encryptedRows = toInsert.map((r) => {
    const enc = encryptPatientFields({
      email: r.email,
      first_name: r.first_name,
      last_name: r.last_name,
      phone: r.phone,
    });

    return {
      email_hash: enc.email_hash,
      phone_hash: enc.phone_hash,
      encrypted_data: enc.encrypted_data,
      encrypted_key: enc.encrypted_key,
      encryption_iv: enc.encryption_iv,
      patient_status: r.patient_status,
    };
  });

  const { error } = await supabase.from("patients").insert(encryptedRows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: toInsert.length, skipped });
}
