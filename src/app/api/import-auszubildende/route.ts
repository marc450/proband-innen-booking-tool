import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedStaff } from "@/lib/auth-verify";
import { normalizeTitle } from "@/lib/utils";

// Row shape produced by the client-side CSV parser on the Auszubildende
// contacts page. Every field except `email` is optional; empty strings are
// coerced to null before insert so the DB stores NULL instead of "".
interface ImportRow {
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  email: string;
  phone?: string | null;
  company_name?: string | null;
  address_line1?: string | null;
  address_postal_code?: string | null;
  address_city?: string | null;
  address_country?: string | null;
  efn?: string | null;
  specialty?: string | null;
  // ISO 8601 UTC string, e.g. "2025-10-12T09:14:00Z". Falls back to
  // Supabase's default now() when absent. Lets us preserve HubSpot's
  // original created date instead of stamping everyone with "today".
  created_at?: string | null;
}

const blank = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  return s.length ? s : null;
};

export async function POST(req: NextRequest) {
  // Verified staff/admin gate — validates the session, never the
  // forgeable x-user-role cookie. This route uses the service-role
  // client (bypasses RLS) and is called only from the staff dashboard.
  const access = await requireVerifiedStaff();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const rows: ImportRow[] = await req.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No data" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Dedup against the auszubildende_emails alias table, which holds
  // every primary email (mirrored by the 046 sync trigger) plus every
  // alias. One query covers both. Compared case-insensitively because
  // HubSpot and Stripe sometimes differ in case.
  const { data: aliasExisting, error: aliasFetchError } = await supabase
    .from("auszubildende_emails")
    .select("email");

  if (aliasFetchError) {
    return NextResponse.json({ error: aliasFetchError.message }, { status: 500 });
  }

  const existingEmails = new Set<string>();
  for (const a of aliasExisting || []) {
    if (a.email) existingEmails.add(a.email.toLowerCase().trim());
  }

  const seenInBatch = new Set<string>();
  const toInsert: Array<Record<string, unknown>> = [];
  let skipped = 0;
  let invalid = 0;

  for (const row of rows) {
    const email = (row.email || "").toLowerCase().trim();
    if (!email) {
      invalid++;
      continue;
    }
    if (existingEmails.has(email) || seenInBatch.has(email)) {
      skipped++;
      continue;
    }
    seenInBatch.add(email);

    const insertRow: Record<string, unknown> = {
      email,
      first_name: blank(row.first_name),
      last_name: blank(row.last_name),
      title: normalizeTitle(row.title),
      phone: blank(row.phone),
      company_name: blank(row.company_name),
      address_line1: blank(row.address_line1),
      address_postal_code: blank(row.address_postal_code),
      address_city: blank(row.address_city),
      address_country: blank(row.address_country),
      efn: blank(row.efn),
      specialty: blank(row.specialty),
      // Combo-tagged HubSpot rows (e.g. "Model Patient; Doctor - Customer")
      // are imported strictly as auszubildende per the user's decision.
      contact_type: "auszubildende",
    };

    const created = blank(row.created_at);
    if (created) insertRow.created_at = created;

    toInsert.push(insertRow);
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ inserted: 0, skipped, invalid });
  }

  // Two-step per row: insert auszubildende (without email — that lives on
  // the alias table), then attach a primary alias row carrying the email.
  // We do this in a loop instead of two bulk INSERTs because we need each
  // returned auszubildende.id paired with its email, and PostgREST bulk
  // inserts don't preserve order across rows.
  let inserted = 0;
  const failed: string[] = [];
  for (const row of toInsert) {
    const { email: rowEmail, ...rest } = row as { email: string } & Record<string, unknown>;
    const { data: created, error: insertError } = await supabase
      .from("auszubildende")
      .insert(rest)
      .select("id")
      .single();
    if (insertError || !created) {
      failed.push(rowEmail);
      continue;
    }
    const aliasInsert = await supabase.from("auszubildende_emails").insert({
      auszubildende_id: created.id,
      email: rowEmail,
      is_primary: true,
      source: "import",
    });
    if (aliasInsert.error) {
      failed.push(rowEmail);
      continue;
    }
    inserted++;
  }

  return NextResponse.json({
    inserted,
    skipped,
    invalid,
    failed: failed.length ? failed : undefined,
  });
}
