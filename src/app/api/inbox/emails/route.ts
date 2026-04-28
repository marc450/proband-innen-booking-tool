import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  encryptFields,
  hashEmail,
} from "@/lib/encryption";

// Multi-email management for inbox contacts.
//   GET ?source=auszubildende|patient&id=<contactId>  → list emails
//   POST { source, id, email }                        → add email
//
// Email format is validated server-side. Uniqueness is enforced by the
// table's UNIQUE(email) / UNIQUE(email_hash) constraint — duplicates from
// other contacts surface as a 409 with a friendly message. Patient emails
// are encrypted per-row mirroring the patient_email_hashes scheme; the
// encrypted_email column is recoverable so the UI can decrypt and display.

type EmailSource = "auszubildende" | "patient";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function assertStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function GET(req: NextRequest) {
  const user = await assertStaff();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const source = req.nextUrl.searchParams.get("source") as EmailSource | null;
  const id = req.nextUrl.searchParams.get("id");
  if (!source || !id) {
    return NextResponse.json({ error: "source and id required" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (source === "auszubildende") {
    const { data, error } = await admin
      .from("auszubildende_emails")
      .select("id, email, is_primary, source, created_at")
      .eq("auszubildende_id", id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ emails: data || [] });
  }

  if (source === "patient") {
    // For patients we need to decrypt encrypted_email per row before
    // returning. Done in PR 3 — this stub returns 501 until then so
    // the client knows to fall back to the legacy `patient.email_hash`
    // column.
    return NextResponse.json(
      { error: "Patient email management not yet enabled" },
      { status: 501 },
    );
  }

  return NextResponse.json({ error: "Invalid source" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const user = await assertStaff();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const source = body.source as EmailSource | undefined;
  const id = body.id as string | undefined;
  const rawEmail = body.email as string | undefined;
  const makePrimary = Boolean(body.makePrimary);

  if (!source || !id || !rawEmail) {
    return NextResponse.json({ error: "source, id, email required" }, { status: 400 });
  }
  const email = normaliseEmail(rawEmail);
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Ungültiges E-Mail-Format" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (source === "auszubildende") {
    // Detect collisions before insert so we can return a clearer message
    // than "duplicate key value".
    const { data: existing } = await admin
      .from("auszubildende_emails")
      .select("auszubildende_id")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      const ownedHere = existing.auszubildende_id === id;
      return NextResponse.json(
        {
          error: ownedHere
            ? "Diese E-Mail ist bereits hinterlegt."
            : "Diese E-Mail ist bereits einer anderen Person zugeordnet.",
        },
        { status: 409 },
      );
    }

    const { data: inserted, error: insErr } = await admin
      .from("auszubildende_emails")
      .insert({
        auszubildende_id: id,
        email,
        is_primary: false,
        source: "manual",
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      return NextResponse.json({ error: insErr?.message || "Insert failed" }, { status: 500 });
    }

    if (makePrimary) {
      await setAuszubildendePrimary(id, inserted.id, email);
    }

    return NextResponse.json({ ok: true, id: inserted.id });
  }

  if (source === "patient") {
    // Hash + per-row encryption + insert. Implemented here so PR 3 only
    // needs to wire the UI, but the GET listing still requires per-row
    // decryption that PR 3 will add.
    const emailHash = hashEmail(email);
    const { data: existing } = await admin
      .from("patient_email_hashes")
      .select("patient_id")
      .eq("email_hash", emailHash)
      .maybeSingle();
    if (existing) {
      const ownedHere = existing.patient_id === id;
      return NextResponse.json(
        {
          error: ownedHere
            ? "Diese E-Mail ist bereits hinterlegt."
            : "Diese E-Mail ist bereits einer anderen Person zugeordnet.",
        },
        { status: 409 },
      );
    }

    const enc = encryptFields({ email });
    const { data: inserted, error: insErr } = await admin
      .from("patient_email_hashes")
      .insert({
        patient_id: id,
        email_hash: emailHash,
        encrypted_email: enc.encrypted_data,
        encrypted_key: enc.encrypted_key,
        encryption_iv: enc.encryption_iv,
        is_primary: false,
        source: "manual",
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      return NextResponse.json({ error: insErr?.message || "Insert failed" }, { status: 500 });
    }

    if (makePrimary) {
      await setPatientPrimary(id, inserted.id, emailHash);
    }

    return NextResponse.json({ ok: true, id: inserted.id });
  }

  return NextResponse.json({ error: "Invalid source" }, { status: 400 });
}

// Promote one row to primary, demote any other primary, and sync the
// legacy `auszubildende.email` column. Two sequential updates: the partial
// unique index allows the brief window where neither row is primary, and
// any failure between steps leaves the contact with no primary which is
// recoverable on next write.
async function setAuszubildendePrimary(
  contactId: string,
  emailRowId: string,
  newPrimaryEmail: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("auszubildende_emails")
    .update({ is_primary: false })
    .eq("auszubildende_id", contactId)
    .eq("is_primary", true);
  await admin
    .from("auszubildende_emails")
    .update({ is_primary: true })
    .eq("id", emailRowId);
  // Keep the legacy `auszubildende.email` column in sync so older code
  // paths (campaign sends, eligibility checks, etc.) keep working until
  // the column is retired.
  await admin
    .from("auszubildende")
    .update({ email: newPrimaryEmail })
    .eq("id", contactId);
}

async function setPatientPrimary(
  patientId: string,
  emailRowId: string,
  newPrimaryEmailHash: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("patient_email_hashes")
    .update({ is_primary: false })
    .eq("patient_id", patientId)
    .eq("is_primary", true);
  await admin
    .from("patient_email_hashes")
    .update({ is_primary: true })
    .eq("id", emailRowId);
  // Keep the legacy `patients.email_hash` column in sync. The patients
  // table also has the email inside encrypted_data; updating that here
  // would require decrypt-merge-encrypt and is intentionally deferred —
  // primary lookup uses email_hash so this is enough.
  await admin
    .from("patients")
    .update({ email_hash: newPrimaryEmailHash })
    .eq("id", patientId);
}

export { setAuszubildendePrimary, setPatientPrimary };
