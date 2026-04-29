import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptPatientFields, hashEmail } from "@/lib/encryption";
import type { PatientStatus } from "@/lib/types";

type ContactType = "auszubildende" | "proband" | "other" | "company";

interface CreateContactBody {
  type: ContactType;
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  status: string;
  title?: string | null;
  specialty?: string | null;
  companyName?: string | null;
  addressStreet?: string | null;
  addressZip?: string | null;
  addressCity?: string | null;
}

const blank = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  return s.length ? s : null;
};

const PATIENT_STATUSES: PatientStatus[] = ["active", "warning", "blacklist", "inactive"];
const AZUBI_STATUSES = ["active", "inactive"] as const;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateContactBody;
  const email = (body.email || "").toLowerCase().trim();
  const firstName = (body.firstName || "").trim();

  if (!email || !firstName || !body.type || !body.status) {
    return NextResponse.json(
      { error: "Pflichtfelder fehlen (Typ, Vorname, E-Mail, Status)." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  if (body.type === "proband") {
    if (!PATIENT_STATUSES.includes(body.status as PatientStatus)) {
      return NextResponse.json({ error: "Ungültiger Status." }, { status: 400 });
    }

    const emailHash = hashEmail(email);
    const [{ data: legacy }, { data: aliases }] = await Promise.all([
      supabase.from("patients").select("id").eq("email_hash", emailHash).maybeSingle(),
      supabase.from("patient_email_hashes").select("patient_id").eq("email_hash", emailHash).maybeSingle(),
    ]);
    if (legacy || aliases) {
      return NextResponse.json(
        { error: "Eine Proband:in mit dieser E-Mail existiert bereits." },
        { status: 409 },
      );
    }

    const enc = encryptPatientFields({
      email,
      first_name: firstName,
      last_name: blank(body.lastName),
      phone: blank(body.phone),
      address_street: blank(body.addressStreet),
      address_zip: blank(body.addressZip),
      address_city: blank(body.addressCity),
    });

    const { data, error } = await supabase
      .from("patients")
      .insert({
        email_hash: enc.email_hash,
        phone_hash: enc.phone_hash,
        encrypted_data: enc.encrypted_data,
        encrypted_key: enc.encrypted_key,
        encryption_iv: enc.encryption_iv,
        patient_status: body.status as PatientStatus,
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Fehler beim Speichern" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, type: "proband" });
  }

  if (!AZUBI_STATUSES.includes(body.status as (typeof AZUBI_STATUSES)[number])) {
    return NextResponse.json({ error: "Ungültiger Status." }, { status: 400 });
  }

  const [{ data: legacy }, { data: aliases }] = await Promise.all([
    supabase.from("auszubildende").select("id").ilike("email", email).maybeSingle(),
    supabase.from("auszubildende_emails").select("auszubildende_id").ilike("email", email).maybeSingle(),
  ]);
  if (legacy || aliases) {
    return NextResponse.json(
      { error: "Eine:r Kontakt mit dieser E-Mail existiert bereits." },
      { status: 409 },
    );
  }

  const insertRow: Record<string, unknown> = {
    email,
    first_name: firstName,
    last_name: blank(body.lastName),
    phone: blank(body.phone),
    title: blank(body.title),
    specialty: blank(body.specialty),
    company_name: blank(body.companyName),
    contact_type: body.type,
    status: body.status,
  };

  const { data, error } = await supabase
    .from("auszubildende")
    .insert(insertRow)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Fehler beim Speichern" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, type: body.type });
}
