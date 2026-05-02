import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// HubSpot "All Deals" XLSX importer. The client-side picker parses the
// workbook, normalises each row into the shape below, and POSTs the
// array here. We:
//
//   1. Match each row's email against existing auszubildende (primary
//      column + alias table). When found, fill in any blank
//      first_name/last_name/title from the import. Otherwise create a
//      new auszubildende with legacy_imported_at + legacy_source set.
//   2. Insert a legacy_bookings row per deal, with a sha256 dedup hash
//      so re-uploading the same export is a no-op.
//
// Critical guarantees the staff dashboard depends on:
//   - No emails are sent. We never call Supabase auth.admin.createUser
//     here, never call Resend, never trigger any reminder cron.
//   - Profile remains "incomplete" — no profile_complete=true is ever
//     set. The profile-completion reminder cron only targets
//     course_bookings, and we don't insert into course_bookings here.

interface DealRow {
  // Free-text display name without the "(email)" suffix, e.g. "Dr. Antje Bodamer".
  contact_display: string;
  email: string;
  product_name: string;
  amount: number | null;
  // ISO date strings (YYYY-MM-DD) for course_date, full ISO for purchased_at.
  course_date: string | null;
  purchased_at: string | null;
}

interface ImportPayload {
  source: string; // e.g. "hubspot_export_2026_05_02"
  rows: DealRow[];
}

interface ImportSummary {
  contacts_created: number;
  contacts_updated: number;
  bookings_inserted: number;
  bookings_skipped_duplicate: number;
  rows_invalid: number;
  rows_total: number;
}

const TITLE_PREFIXES = [
  "Prof. Dr. med. dent.",
  "Prof. Dr. med.",
  "Prof. Dr.",
  "Dr. med. dent.",
  "Dr. med.",
  "Dr. dent.",
  "PD Dr. med.",
  "PD Dr.",
  "Dr.",
  "Prof.",
];

// Pull a known title prefix off the front of the display name. Returns
// the title (or null) and the rest of the string with the title removed.
// Comparison is case-insensitive on the prefix only — names keep their
// original casing in the rest.
function splitTitle(displayName: string): { title: string | null; rest: string } {
  const trimmed = displayName.trim();
  for (const title of TITLE_PREFIXES) {
    const lower = trimmed.toLowerCase();
    const prefix = title.toLowerCase();
    if (lower.startsWith(prefix + " ")) {
      return { title, rest: trimmed.slice(title.length).trim() };
    }
    // Allow exact-match of the title alone (rare but defensive).
    if (lower === prefix) {
      return { title, rest: "" };
    }
  }
  return { title: null, rest: trimmed };
}

function parseDisplayName(displayName: string): {
  title: string | null;
  first_name: string | null;
  last_name: string | null;
} {
  const { title, rest } = splitTitle(displayName);
  if (!rest) return { title, first_name: null, last_name: null };
  const parts = rest.split(/\s+/);
  return {
    title,
    first_name: parts[0] ?? null,
    last_name: parts.slice(1).join(" ") || null,
  };
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

// Compute the dedup hash for a row. Stored on legacy_bookings so a
// re-upload of the same export hits ON CONFLICT DO NOTHING and silently
// skips. Hash inputs are normalised so trivial whitespace/case
// differences in HubSpot don't accidentally pass through.
function dedupeHash(row: DealRow): string {
  const parts = [
    row.email.trim().toLowerCase(),
    row.product_name.trim(),
    row.amount === null ? "" : String(row.amount),
    row.course_date ?? "",
    row.purchased_at ?? "",
  ].join("|");
  return crypto.createHash("sha256").update(parts).digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
  if (!source) {
    return NextResponse.json(
      { error: "source field is required" },
      { status: 400 },
    );
  }
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "rows array is empty" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const summary: ImportSummary = {
    contacts_created: 0,
    contacts_updated: 0,
    bookings_inserted: 0,
    bookings_skipped_duplicate: 0,
    rows_invalid: 0,
    rows_total: rows.length,
  };

  // ── Step 1: filter rows missing an email and group by email so we
  // touch each contact exactly once. Per the product decision, rows
  // without an email are silently skipped.
  const valid: DealRow[] = [];
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
  // the legacy primary column AND the multi-email alias table so an
  // address registered as an alias on contact A doesn't spawn a new
  // contact B.
  const [{ data: primaryHits }, { data: aliasHits }] = await Promise.all([
    admin
      .from("auszubildende")
      .select("id, email, first_name, last_name, title")
      .in("email", emailsInBatch),
    admin
      .from("auszubildende_emails")
      .select("auszubildende_id, email")
      .in("email", emailsInBatch),
  ]);

  // Build email → auszubildende_id map. Aliases override duplicates by
  // primary as a tiebreaker is unnecessary — UNIQUE (email) on the alias
  // table makes that conflict impossible.
  const emailToContactId = new Map<string, string>();
  const contactRichness = new Map<
    string,
    { first_name: string | null; last_name: string | null; title: string | null }
  >();
  for (const row of primaryHits ?? []) {
    if (!row.email) continue;
    emailToContactId.set(row.email, row.id);
    contactRichness.set(row.id, {
      first_name: row.first_name ?? null,
      last_name: row.last_name ?? null,
      title: row.title ?? null,
    });
  }
  for (const row of aliasHits ?? []) {
    if (!row.email) continue;
    emailToContactId.set(row.email, row.auszubildende_id);
    if (!contactRichness.has(row.auszubildende_id)) {
      // We didn't fetch the parent row's name fields above; do it now
      // so the blank-fill-in step below has data to compare against.
      contactRichness.set(row.auszubildende_id, {
        first_name: null,
        last_name: null,
        title: null,
      });
    }
  }

  // For aliases that pointed at contacts we didn't already fetch,
  // backfill the name/title state in one extra query.
  const missingRichnessIds = Array.from(emailToContactId.values()).filter(
    (id) => {
      const r = contactRichness.get(id);
      return !r || (r.first_name === null && r.last_name === null && r.title === null);
    },
  );
  if (missingRichnessIds.length > 0) {
    const { data: extra } = await admin
      .from("auszubildende")
      .select("id, first_name, last_name, title")
      .in("id", missingRichnessIds);
    for (const e of extra ?? []) {
      contactRichness.set(e.id, {
        first_name: e.first_name ?? null,
        last_name: e.last_name ?? null,
        title: e.title ?? null,
      });
    }
  }

  // ── Step 3: for every email we've never seen, create a new
  // auszubildende. Group by email so we only INSERT once per contact
  // even if the same email appears across multiple deal rows.
  const nowIso = new Date().toISOString();
  const newContactsByEmail = new Map<
    string,
    { email: string; title: string | null; first_name: string | null; last_name: string | null }
  >();
  for (const row of valid) {
    if (emailToContactId.has(row.email)) continue;
    if (newContactsByEmail.has(row.email)) continue;
    const parsed = parseDisplayName(row.contact_display || "");
    newContactsByEmail.set(row.email, {
      email: row.email,
      title: parsed.title,
      first_name: parsed.first_name,
      last_name: parsed.last_name,
    });
  }

  if (newContactsByEmail.size > 0) {
    const insertRows = Array.from(newContactsByEmail.values()).map((c) => ({
      email: c.email,
      title: c.title,
      first_name: c.first_name,
      last_name: c.last_name,
      contact_type: "auszubildende",
      legacy_imported_at: nowIso,
      legacy_source: source,
    }));
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

    // Mirror the new emails into auszubildende_emails as primaries so
    // the multi-email lookup paths see them too. Same pattern that
    // import-auszubildende uses for fresh inserts. Best-effort: a
    // missing alias row doesn't break the main import.
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

  // ── Step 4: fill in blank name/title fields on existing contacts
  // when the import has them. Per product decision: import always
  // wins for fields that are currently NULL on the contact, never
  // overwrites non-empty values.
  const contactPatches = new Map<
    string,
    { first_name?: string; last_name?: string; title?: string }
  >();
  for (const row of valid) {
    const contactId = emailToContactId.get(row.email);
    if (!contactId) continue;
    const existing = contactRichness.get(contactId);
    if (!existing) continue; // freshly created above, nothing to patch
    const parsed = parseDisplayName(row.contact_display || "");
    const patch: { first_name?: string; last_name?: string; title?: string } = {};
    if (existing.first_name === null && parsed.first_name) patch.first_name = parsed.first_name;
    if (existing.last_name === null && parsed.last_name) patch.last_name = parsed.last_name;
    if (existing.title === null && parsed.title) patch.title = parsed.title;
    if (Object.keys(patch).length === 0) continue;
    // Only schedule one patch per contact; if multiple deal rows want
    // to fill the same blank, the first wins. They should all parse
    // to the same display name anyway.
    if (!contactPatches.has(contactId)) {
      contactPatches.set(contactId, patch);
      // Optimistically update local state so subsequent rows skip.
      contactRichness.set(contactId, {
        first_name: existing.first_name ?? patch.first_name ?? null,
        last_name: existing.last_name ?? patch.last_name ?? null,
        title: existing.title ?? patch.title ?? null,
      });
    }
  }
  for (const [contactId, patch] of contactPatches) {
    const { error: patchErr } = await admin
      .from("auszubildende")
      .update(patch)
      .eq("id", contactId);
    if (!patchErr) summary.contacts_updated++;
  }

  // ── Step 5: insert one legacy_bookings row per deal. Dedup hash
  // ensures re-running the same import is a no-op.
  const bookingRows: Array<Record<string, unknown>> = [];
  const seenHashesInBatch = new Set<string>();
  for (const row of valid) {
    const contactId = emailToContactId.get(row.email);
    if (!contactId) {
      summary.rows_invalid++;
      continue;
    }
    const hash = dedupeHash(row);
    if (seenHashesInBatch.has(hash)) {
      summary.bookings_skipped_duplicate++;
      continue;
    }
    seenHashesInBatch.add(hash);
    bookingRows.push({
      auszubildende_id: contactId,
      product_name: (row.product_name || "").trim(),
      amount_eur: row.amount,
      course_date: row.course_date,
      purchased_at: row.purchased_at,
      source,
      source_dedupe_hash: hash,
    });
  }

  if (bookingRows.length > 0) {
    // Supabase doesn't expose ON CONFLICT DO NOTHING via the JS client
    // ergonomically, so we use the upsert with onConflict and
    // ignoreDuplicates=true. Note the unique index targets the pair
    // (source, source_dedupe_hash), matching the migration.
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

  return NextResponse.json({ summary });
}
