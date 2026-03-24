import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PatientStatus } from "@/lib/types";

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

  // Fetch existing emails to detect duplicates
  const { data: existing } = await supabase
    .from("patients")
    .select("email");

  const existingEmails = new Set((existing || []).map((p) => p.email.toLowerCase()));

  const toInsert = rows.filter((r) => !existingEmails.has(r.email.toLowerCase()));
  const skipped = rows.length - toInsert.length;

  if (toInsert.length === 0) {
    return NextResponse.json({ inserted: 0, skipped });
  }

  const { error } = await supabase.from("patients").insert(toInsert);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: toInsert.length, skipped });
}
