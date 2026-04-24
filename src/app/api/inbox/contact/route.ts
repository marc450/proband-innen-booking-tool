import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  hashEmail,
  decryptPatient,
  decryptFields,
  encryptFields,
} from "@/lib/encryption";

// Unified contact lookup + inline update endpoint for the inbox right
// sidebar. Matches an email address against auszubildende first (plaintext,
// cheap) and falls back to the patients table (E2EE, decrypt-then-match).
// Returns a normalised profile shape plus related records: course bookings,
// Stripe invoices (by customer email), and no-show bookings.
//
// PATCH accepts a patch object, re-encrypts on the fly for patients and
// does a plain UPDATE for auszubildende. Only the fields the sidebar
// exposes are writable; everything else is silently ignored.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  // Explicit API version is not required; let the account default apply.
});

type ContactSource = "auszubildende" | "patient" | "unknown";

type ContactDTO = {
  source: ContactSource;
  id: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  phone: string | null;
  companyName: string | null;
  specialty: string | null;
  efn: string | null;
  gender: string | null;
  birthdate: string | null;
  addressLine1: string | null;
  addressPostalCode: string | null;
  addressCity: string | null;
  addressCountry: string | null;
  notes: string | null;
  status: string | null;
  createdAt: string | null;
  // Patient-only extras
  patientStatus: string | null;
};

type CourseBookingRow = {
  id: string;
  status: string;
  amount_paid: number | null;
  course_type: string | null;
  created_at: string;
  course_templates: { title: string | null } | null;
  course_sessions: { date_iso: string | null; label_de: string | null } | null;
};

async function assertStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return user;
}

async function lookupAuszubildende(email: string): Promise<ContactDTO | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("auszubildende")
    .select("*")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    source: "auszubildende",
    id: data.id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    title: data.title,
    phone: data.phone,
    companyName: data.company_name,
    specialty: data.specialty,
    efn: data.efn,
    gender: data.gender,
    birthdate: data.birthdate,
    addressLine1: data.address_line1,
    addressPostalCode: data.address_postal_code,
    addressCity: data.address_city,
    addressCountry: data.address_country,
    notes: data.notes,
    status: data.status,
    createdAt: data.created_at,
    patientStatus: null,
  };
}

async function lookupPatient(email: string): Promise<ContactDTO | null> {
  const admin = createAdminClient();
  const emailHash = hashEmail(email);
  const { data } = await admin
    .from("patients")
    .select("*")
    .eq("email_hash", emailHash)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  let p;
  try {
    p = decryptPatient(data);
  } catch {
    return null;
  }
  return {
    source: "patient",
    id: p.id,
    email: p.email,
    firstName: p.first_name,
    lastName: p.last_name,
    title: null,
    phone: p.phone,
    companyName: null,
    specialty: null,
    efn: null,
    gender: null,
    birthdate: null,
    addressLine1: p.address_street,
    addressPostalCode: p.address_zip,
    addressCity: p.address_city,
    addressCountry: null,
    notes: p.notes,
    status: null,
    createdAt: p.created_at,
    patientStatus: p.patient_status,
  };
}

async function fetchCourseBookings(auszubildendeId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("course_bookings")
    .select(
      "id, status, amount_paid, course_type, created_at, course_templates (title), course_sessions (date_iso, label_de)"
    )
    .eq("auszubildende_id", auszubildendeId)
    .order("created_at", { ascending: false });
  return (data || []) as unknown as CourseBookingRow[];
}

async function fetchStripeInvoices(email: string) {
  if (!process.env.STRIPE_SECRET_KEY) return [];
  try {
    // Look up customer by email, then list invoices for it. Stripe returns
    // the freshest matching customer first.
    const customers = await stripe.customers.list({ email, limit: 3 });
    if (!customers.data.length) return [];
    const invoices: Array<{
      id: string;
      number: string | null;
      status: string;
      amount_due: number;
      amount_paid: number;
      currency: string;
      created: number;
      hosted_invoice_url: string | null;
      invoice_pdf: string | null;
    }> = [];
    for (const c of customers.data) {
      const list = await stripe.invoices.list({ customer: c.id, limit: 20 });
      for (const inv of list.data) {
        invoices.push({
          id: inv.id ?? "",
          number: inv.number,
          status: inv.status ?? "draft",
          amount_due: inv.amount_due,
          amount_paid: inv.amount_paid,
          currency: inv.currency,
          created: inv.created,
          hosted_invoice_url: inv.hosted_invoice_url ?? null,
          invoice_pdf: inv.invoice_pdf ?? null,
        });
      }
    }
    invoices.sort((a, b) => b.created - a.created);
    return invoices;
  } catch (err) {
    console.error("Stripe invoice lookup failed:", err);
    return [];
  }
}

async function fetchNoShows(email: string, patientId: string | null) {
  // No-shows live on the encrypted bookings table (keyed by patient_id or
  // email_hash). Course bookings don't track no-show explicitly, so this
  // section only shows proband no-shows. For non-patient contacts we return
  // an empty list.
  if (!patientId) {
    // Try by email_hash in case the patient row exists but wasn't linked
    const admin = createAdminClient();
    const hash = hashEmail(email);
    const { data } = await admin
      .from("bookings")
      .select("id, created_at, status, slot_id")
      .eq("email_hash", hash)
      .eq("status", "no_show");
    return data || [];
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("id, created_at, status, slot_id")
    .eq("patient_id", patientId)
    .eq("status", "no_show");
  return data || [];
}

export async function GET(req: NextRequest) {
  const user = await assertStaff();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const email = (req.nextUrl.searchParams.get("email") || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  // Priority: auszubildende (plaintext match) → patients (hash match).
  // An email can technically appear in both tables (e.g. a doctor who was
  // also a proband). The inbox sidebar shows Ärzt:innen data by preference
  // since that's where course enrolments + invoices live.
  let contact = await lookupAuszubildende(email);
  if (!contact) contact = await lookupPatient(email);

  if (!contact) {
    return NextResponse.json({
      contact: {
        source: "unknown",
        id: null,
        email,
        firstName: null,
        lastName: null,
        title: null,
        phone: null,
        companyName: null,
        specialty: null,
        efn: null,
        gender: null,
        birthdate: null,
        addressLine1: null,
        addressPostalCode: null,
        addressCity: null,
        addressCountry: null,
        notes: null,
        status: null,
        createdAt: null,
        patientStatus: null,
      } satisfies ContactDTO,
      courseBookings: [],
      invoices: [],
      noShows: [],
    });
  }

  const [courseBookings, invoices, noShows] = await Promise.all([
    contact.source === "auszubildende" && contact.id
      ? fetchCourseBookings(contact.id)
      : Promise.resolve([] as CourseBookingRow[]),
    fetchStripeInvoices(email),
    fetchNoShows(email, contact.source === "patient" ? contact.id : null),
  ]);

  return NextResponse.json({ contact, courseBookings, invoices, noShows });
}

// ── Inline update ────────────────────────────────────────────────────────
// PATCH { source, id, patch }
// - auszubildende: plain column update on whitelisted fields
// - patient: decrypt → merge → re-encrypt → update

const AUSZUBILDENDE_WRITABLE = new Set([
  "first_name",
  "last_name",
  "title",
  "phone",
  "company_name",
  "specialty",
  "efn",
  "gender",
  "birthdate",
  "address_line1",
  "address_postal_code",
  "address_city",
  "address_country",
  "notes",
  "status",
]);

const PATIENT_WRITABLE = new Set([
  "first_name",
  "last_name",
  "phone",
  "address_street",
  "address_zip",
  "address_city",
  "notes",
]);

export async function PATCH(req: NextRequest) {
  const user = await assertStaff();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { source, id, patch } = await req.json();
  if (!source || !id || !patch || typeof patch !== "object") {
    return NextResponse.json({ error: "source, id, patch required" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (source === "auszubildende") {
    const filtered: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (AUSZUBILDENDE_WRITABLE.has(k)) filtered[k] = v === "" ? null : v;
    }
    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ ok: true, updated: 0 });
    }
    const { error } = await admin
      .from("auszubildende")
      .update(filtered)
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (source === "patient") {
    // patient_status is a plaintext column, not part of the encrypted blob
    // — handle it with a direct column update instead of decrypt/re-encrypt.
    if ("patient_status" in patch) {
      const raw = patch.patient_status;
      const allowed = new Set(["active", "warning", "blacklist", "inactive"]);
      if (typeof raw !== "string" || !allowed.has(raw)) {
        return NextResponse.json({ error: "Invalid patient_status" }, { status: 400 });
      }
      const { error } = await admin
        .from("patients")
        .update({ patient_status: raw })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    const { data: row } = await admin
      .from("patients")
      .select("encrypted_data, encrypted_key, encryption_iv")
      .eq("id", id)
      .single();
    if (!row?.encrypted_data) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    const fields = decryptFields<Record<string, unknown>>(
      row.encrypted_data,
      row.encrypted_key,
      row.encryption_iv
    );
    for (const [k, v] of Object.entries(patch)) {
      if (PATIENT_WRITABLE.has(k)) fields[k] = v === "" ? null : v;
    }
    const enc = encryptFields(fields);
    const { error } = await admin
      .from("patients")
      .update({
        encrypted_data: enc.encrypted_data,
        encrypted_key: enc.encrypted_key,
        encryption_iv: enc.encryption_iv,
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid source" }, { status: 400 });
}
