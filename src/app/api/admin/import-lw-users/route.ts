import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// LearnWorlds user-export XLSX importer. The client-side picker parses
// the workbook, normalises each row into the shape below, and POSTs the
// array here. Each row corresponds to ONE LearnWorlds user; the user's
// `courses` array becomes one legacy_bookings row per course slug.
//
// Critical post-step: after the LW rows land, we run a single DELETE
// that removes any legacy_bookings from a HubSpot import for any
// auszubildende that NOW has LW data. This implements the per-customer
// dedup strategy ("when both sources have data, prefer LW slugs over
// HubSpot product names"), preserving Praxis-only customers (HubSpot
// only) untouched.
//
// Guarantees the staff dashboard depends on:
//   - No emails are sent. We never call Supabase auth.admin.createUser
//     here, never call Resend, never trigger any reminder cron.
//   - Profile remains "incomplete" — the profile-completion reminder
//     cron only targets course_bookings, not legacy_bookings.

interface LwUserRow {
  lw_user_id: string;
  username: string;
  email: string;
  signup: string | null;          // ISO timestamp ("2024-05-06T13:11:42Z" preferred)
  courses: string[];              // course slug list
  title: string | null;
  gender: string | null;
  birthdate: string | null;       // "YYYY-MM-DD"
  specialty: string | null;
  efn: string | null;
  address_line1: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  address_country: string | null;
}

interface ImportPayload {
  source: string; // e.g. "lw_export_2026_05_02"
  rows: LwUserRow[];
}

interface ImportSummary {
  contacts_created: number;
  contacts_updated: number;
  bookings_inserted: number;
  bookings_skipped_duplicate: number;
  hubspot_rows_superseded: number;
  rows_invalid: number;
  rows_total: number;
}

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") return user;
  return null;
}

function dedupeHash(email: string, slug: string, source: string): string {
  // Same shape as the HubSpot importer (email|product|amount|date|date)
  // with empty slots for the LW-missing fields. The `source` column on
  // the unique index already segregates LW rows from HubSpot rows, so
  // we don't need to mix the source into the hash itself, but we'll
  // include it for symmetry with the HubSpot impl.
  void source;
  const parts = [email.trim().toLowerCase(), slug.trim(), "", "", ""].join("|");
  return crypto.createHash("sha256").update(parts).digest("hex");
}

const normalizeEmail = (e: string) => e.trim().toLowerCase();

// Empty-string → null, trim everything else. Matches the convention
// the rest of the auszubildende write paths use.
function blank(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

// "Marc Wyss"     → { first: "Marc",  last: "Wyss" }
// "Aimée"         → { first: "Aimée", last: null }
// "van der Berg"  → { first: "van",   last: "der Berg" }
// LW usernames don't include titles (the title is in a separate column),
// so a plain whitespace split is correct.
function splitUsername(username: string): {
  first: string | null;
  last: string | null;
} {
  const trimmed = username.trim();
  if (!trimmed) return { first: null, last: null };
  const parts = trimmed.split(/\s+/);
  return {
    first: parts[0] ?? null,
    last: parts.slice(1).join(" ") || null,
  };
}

export async function POST(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let payload: ImportPayload;
  try {
    payload = (await req.json()) as ImportPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const source = (payload.source || "").trim();
  if (!source || !source.startsWith("lw_export_")) {
    return NextResponse.json(
      { error: 'source must start with "lw_export_"' },
      { status: 400 },
    );
  }
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "rows array is empty" }, { status: 400 });
  }

  const admin = createAdminClient();
  const summary: ImportSummary = {
    contacts_created: 0,
    contacts_updated: 0,
    bookings_inserted: 0,
    bookings_skipped_duplicate: 0,
    hubspot_rows_superseded: 0,
    rows_invalid: 0,
    rows_total: rows.length,
  };

  // ── Step 1: filter rows with no email + normalise.
  const valid: LwUserRow[] = [];
  for (const row of rows) {
    const email = normalizeEmail(row.email || "");
    if (!email) {
      summary.rows_invalid++;
      continue;
    }
    valid.push({ ...row, email });
  }
  if (valid.length === 0) {
    return NextResponse.json({ summary });
  }

  const emailsInBatch = Array.from(new Set(valid.map((r) => r.email)));

  // ── Step 2: resolve which auszubildende owns each email. Hits both
  // the legacy primary column AND the multi-email alias table.
  const [{ data: primaryHits }, { data: aliasHits }] = await Promise.all([
    admin
      .from("auszubildende")
      .select(
        "id, email, first_name, last_name, title, gender, birthdate, specialty, efn, address_line1, address_postal_code, address_city, address_country, lw_user_id",
      )
      .in("email", emailsInBatch),
    admin
      .from("auszubildende_emails")
      .select("auszubildende_id, email")
      .in("email", emailsInBatch),
  ]);

  type ContactState = {
    first_name: string | null;
    last_name: string | null;
    title: string | null;
    gender: string | null;
    birthdate: string | null;
    specialty: string | null;
    efn: string | null;
    address_line1: string | null;
    address_postal_code: string | null;
    address_city: string | null;
    address_country: string | null;
    lw_user_id: string | null;
  };

  const emailToContactId = new Map<string, string>();
  const contactState = new Map<string, ContactState>();
  for (const row of primaryHits ?? []) {
    if (!row.email) continue;
    emailToContactId.set(row.email, row.id);
    contactState.set(row.id, {
      first_name: row.first_name ?? null,
      last_name: row.last_name ?? null,
      title: row.title ?? null,
      gender: row.gender ?? null,
      birthdate: row.birthdate ?? null,
      specialty: row.specialty ?? null,
      efn: row.efn ?? null,
      address_line1: row.address_line1 ?? null,
      address_postal_code: row.address_postal_code ?? null,
      address_city: row.address_city ?? null,
      address_country: row.address_country ?? null,
      lw_user_id: row.lw_user_id ?? null,
    });
  }
  for (const row of aliasHits ?? []) {
    if (!row.email) continue;
    emailToContactId.set(row.email, row.auszubildende_id);
  }

  // For aliased contacts whose state we didn't already fetch, fill in.
  const missingStateIds = Array.from(
    new Set(
      Array.from(emailToContactId.values()).filter((id) => !contactState.has(id)),
    ),
  );
  if (missingStateIds.length > 0) {
    const { data: extra } = await admin
      .from("auszubildende")
      .select(
        "id, first_name, last_name, title, gender, birthdate, specialty, efn, address_line1, address_postal_code, address_city, address_country, lw_user_id",
      )
      .in("id", missingStateIds);
    for (const e of extra ?? []) {
      contactState.set(e.id, {
        first_name: e.first_name ?? null,
        last_name: e.last_name ?? null,
        title: e.title ?? null,
        gender: e.gender ?? null,
        birthdate: e.birthdate ?? null,
        specialty: e.specialty ?? null,
        efn: e.efn ?? null,
        address_line1: e.address_line1 ?? null,
        address_postal_code: e.address_postal_code ?? null,
        address_city: e.address_city ?? null,
        address_country: e.address_country ?? null,
        lw_user_id: e.lw_user_id ?? null,
      });
    }
  }

  // ── Step 3: create new auszubildende rows for emails we haven't
  // seen. Per the product decision the LW row's full profile data is
  // populated upfront for new contacts (we have everything anyway).
  const nowIso = new Date().toISOString();
  const newByEmail = new Map<string, LwUserRow>();
  for (const row of valid) {
    if (emailToContactId.has(row.email)) continue;
    if (newByEmail.has(row.email)) continue;
    newByEmail.set(row.email, row);
  }
  if (newByEmail.size > 0) {
    const insertRows = Array.from(newByEmail.values()).map((row) => {
      const { first, last } = splitUsername(row.username || "");
      return {
        email: row.email,
        first_name: first,
        last_name: last,
        title: blank(row.title),
        gender: blank(row.gender),
        birthdate: blank(row.birthdate),
        specialty: blank(row.specialty),
        efn: blank(row.efn),
        address_line1: blank(row.address_line1),
        address_postal_code: blank(row.address_postal_code),
        address_city: blank(row.address_city),
        address_country: blank(row.address_country),
        lw_user_id: blank(row.lw_user_id),
        contact_type: "auszubildende",
        legacy_imported_at: nowIso,
        legacy_source: source,
      };
    });
    const { data: inserted, error: insertErr } = await admin
      .from("auszubildende")
      .insert(insertRows)
      .select("id, email");
    if (insertErr) {
      return NextResponse.json(
        { error: `Insert auszubildende failed: ${insertErr.message}` },
        { status: 500 },
      );
    }
    for (const r of inserted ?? []) {
      if (r.email) emailToContactId.set(r.email, r.id);
    }
    summary.contacts_created += inserted?.length ?? 0;

    // Mirror the new emails into auszubildende_emails as primaries.
    const aliasRows = (inserted ?? [])
      .filter((r) => r.email)
      .map((r) => ({
        auszubildende_id: r.id,
        email: r.email,
        is_primary: true,
        source: "import",
      }));
    if (aliasRows.length > 0) {
      await admin.from("auszubildende_emails").insert(aliasRows);
    }
  }

  // ── Step 4: enrich existing contacts. Per product decision, only
  // fill blank fields, never overwrite. Includes lw_user_id so we can
  // call LW's user-scoped APIs later for users that pre-existed in our
  // DB (created via HubSpot import or natively).
  for (const row of valid) {
    const contactId = emailToContactId.get(row.email);
    if (!contactId) continue;
    const existing = contactState.get(contactId);
    if (!existing) continue; // freshly created above; nothing to patch
    const { first, last } = splitUsername(row.username || "");
    const patch: Record<string, string> = {};
    if (existing.first_name === null && first) patch.first_name = first;
    if (existing.last_name === null && last) patch.last_name = last;
    if (existing.title === null && blank(row.title)) patch.title = blank(row.title)!;
    if (existing.gender === null && blank(row.gender)) patch.gender = blank(row.gender)!;
    if (existing.birthdate === null && blank(row.birthdate)) patch.birthdate = blank(row.birthdate)!;
    if (existing.specialty === null && blank(row.specialty)) patch.specialty = blank(row.specialty)!;
    if (existing.efn === null && blank(row.efn)) patch.efn = blank(row.efn)!;
    if (existing.address_line1 === null && blank(row.address_line1)) patch.address_line1 = blank(row.address_line1)!;
    if (existing.address_postal_code === null && blank(row.address_postal_code)) patch.address_postal_code = blank(row.address_postal_code)!;
    if (existing.address_city === null && blank(row.address_city)) patch.address_city = blank(row.address_city)!;
    if (existing.address_country === null && blank(row.address_country)) patch.address_country = blank(row.address_country)!;
    if (existing.lw_user_id === null && blank(row.lw_user_id)) patch.lw_user_id = blank(row.lw_user_id)!;
    if (Object.keys(patch).length === 0) continue;
    const { error: patchErr } = await admin
      .from("auszubildende")
      .update(patch)
      .eq("id", contactId);
    if (!patchErr) {
      summary.contacts_updated++;
      // Optimistically bake the patch into local state so subsequent
      // rows (same auszubildende, e.g. via alias email) don't try to
      // re-patch the same fields.
      contactState.set(contactId, { ...existing, ...patch });
    }
  }

  // ── Step 5: insert one legacy_bookings row per (user, course slug).
  // Uses the same dedup-hash + ON CONFLICT pattern as the HubSpot
  // importer, scoped per `source` so LW rows can never collide with
  // HubSpot rows on the unique index.
  const bookingRows: Array<Record<string, unknown>> = [];
  const seenHashesInBatch = new Set<string>();
  for (const row of valid) {
    const contactId = emailToContactId.get(row.email);
    if (!contactId) {
      summary.rows_invalid++;
      continue;
    }
    const purchasedAt = blank(row.signup);
    for (const slug of row.courses ?? []) {
      const trimmed = (slug || "").trim();
      if (!trimmed) continue;
      const hash = dedupeHash(row.email, trimmed, source);
      if (seenHashesInBatch.has(hash)) {
        summary.bookings_skipped_duplicate++;
        continue;
      }
      seenHashesInBatch.add(hash);
      bookingRows.push({
        auszubildende_id: contactId,
        product_name: trimmed,
        amount_eur: null,
        course_date: null,
        purchased_at: purchasedAt,
        source,
        source_dedupe_hash: hash,
      });
    }
  }

  if (bookingRows.length > 0) {
    const { data: insertedBookings, error: bookingsErr } = await admin
      .from("legacy_bookings")
      .upsert(bookingRows, {
        onConflict: "source,source_dedupe_hash",
        ignoreDuplicates: true,
      })
      .select("id");
    if (bookingsErr) {
      return NextResponse.json(
        { error: `Insert legacy_bookings failed: ${bookingsErr.message}` },
        { status: 500 },
      );
    }
    summary.bookings_inserted = insertedBookings?.length ?? 0;
    summary.bookings_skipped_duplicate +=
      bookingRows.length - (insertedBookings?.length ?? 0);
  }

  // ── Step 6: per-customer HubSpot dedup. After LW rows have landed,
  // delete every HubSpot legacy_bookings row that belongs to a contact
  // who NOW has at least one LW row. Praxis-only HubSpot contacts (no
  // LW row) are untouched and keep their HubSpot bookings.
  //
  // Two round-trips because the Supabase JS client doesn't expose SQL
  // subqueries: first we fetch the set of contact IDs that have LW
  // data, then we delete the HubSpot rows for those contacts. If no
  // contacts overlap (rare on small imports, common on the first run
  // after a fresh database), we skip the delete entirely so we don't
  // pass an empty array to .in() and risk a no-op edge case.
  const { data: lwOwners } = await admin
    .from("legacy_bookings")
    .select("auszubildende_id")
    .like("source", "lw_export_%");
  const lwOwnerIds = Array.from(
    new Set((lwOwners ?? []).map((r) => r.auszubildende_id)),
  );

  if (lwOwnerIds.length > 0) {
    const { data: supersededRows, error: supersedeErr } = await admin
      .from("legacy_bookings")
      .delete()
      .like("source", "hubspot_deals_%")
      .in("auszubildende_id", lwOwnerIds)
      .select("id");
    if (supersedeErr) {
      // Don't fail the whole request — the LW rows already landed
      // cleanly. Surface the error so the operator can re-run the
      // dedup manually if needed.
      console.error("LW import: HubSpot dedup failed:", supersedeErr);
    } else {
      summary.hubspot_rows_superseded = supersededRows?.length ?? 0;
    }
  }

  return NextResponse.json({ summary });
}
