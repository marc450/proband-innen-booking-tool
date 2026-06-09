import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedAdmin } from "@/lib/auth-verify";
import { enrollInLearnWorlds } from "@/lib/post-purchase";
import {
  decryptPatient,
  encryptPatientFields,
  encryptFields,
  hashEmail,
} from "@/lib/encryption";
import type { PatientStatus } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// Merge contact B into contact A. A's non-empty fields win; B's emails,
// bookings and related rows all reassign to A; B is deleted at the end.
//
// Sequential rather than transactional. If a step fails mid-way the
// remaining state is benign: A ends up with B's data anyway and the
// orphaned B row can be re-merged or hand-cleaned. The order is chosen
// so that no FK to B is left dangling before B is deleted.

type MergeSource = "auszubildende" | "patient";

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

// ── Auszubildende (doctor) merge ───────────────────────────────────────────

interface AuszubildendeRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  notes: string | null;
  status: string | null;
  title: string | null;
  gender: string | null;
  specialty: string | null;
  birthdate: string | null;
  efn: string | null;
  profile_complete: boolean | null;
  contact_type: string | null;
  company_name: string | null;
  vat_id: string | null;
  address_line1: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  address_country: string | null;
}

const MERGEABLE_FIELDS: Array<keyof AuszubildendeRow> = [
  "first_name",
  "last_name",
  "phone",
  "title",
  "gender",
  "specialty",
  "birthdate",
  "efn",
  "contact_type",
  "company_name",
  "vat_id",
  "address_line1",
  "address_postal_code",
  "address_city",
  "address_country",
];

async function mergeAuszubildende(
  admin: SupabaseClient,
  primaryId: string,
  mergedId: string,
): Promise<NextResponse> {
  const [{ data: a }, { data: b }] = await Promise.all([
    admin.from("v_auszubildende").select("*").eq("id", primaryId).maybeSingle(),
    admin.from("v_auszubildende").select("*").eq("id", mergedId).maybeSingle(),
  ]);

  if (!a || !b) {
    return NextResponse.json(
      { error: "Mindestens einer der Kontakte wurde nicht gefunden" },
      { status: 404 },
    );
  }

  const aRow = a as AuszubildendeRow;
  const bRow = b as AuszubildendeRow;

  // Step 1: Demote B's primary email so the partial unique index
  // "one_primary_per_auszubildende" doesn't reject the reassign in step 2.
  await admin
    .from("auszubildende_emails")
    .update({ is_primary: false })
    .eq("auszubildende_id", mergedId)
    .eq("is_primary", true);

  // Step 2: Reassign B's emails to A. UNIQUE(email) prevents duplicates
  // across contacts globally, so this just moves the rows. Any email B
  // already shared with A would have been rejected at insert time, so no
  // de-dup is needed here.
  const { count: emailsMoved } = await admin
    .from("auszubildende_emails")
    .update({ auszubildende_id: primaryId, source: "merge" }, { count: "exact" })
    .eq("auszubildende_id", mergedId);

  // Step 3: Reassign B's course bookings to A (preserves history under A).
  const { count: bookingsMoved } = await admin
    .from("course_bookings")
    .update({ auszubildende_id: primaryId }, { count: "exact" })
    .eq("auszubildende_id", mergedId);

  // Step 4: Reassign B's merch orders to A.
  const { count: ordersMoved } = await admin
    .from("merch_orders")
    .update({ auszubildende_id: primaryId }, { count: "exact" })
    .eq("auszubildende_id", mergedId);

  // Step 5: Field merge — for each null/empty field on A, copy B's value.
  const patch: Partial<AuszubildendeRow> = {};
  for (const field of MERGEABLE_FIELDS) {
    if (isEmpty(aRow[field]) && !isEmpty(bRow[field])) {
      // @ts-expect-error narrow assignment
      patch[field] = bRow[field];
    }
  }

  // Notes get concatenated rather than overwritten — context is precious.
  if (!isEmpty(bRow.notes)) {
    patch.notes = isEmpty(aRow.notes)
      ? bRow.notes
      : `${aRow.notes}\n\n--- Zusammengeführt von ${bRow.email || "anderem Kontakt"} ---\n${bRow.notes}`;
  }

  // profile_complete: OR-merge. If either was complete, the merged record is.
  if (bRow.profile_complete && !aRow.profile_complete) {
    patch.profile_complete = true;
  }

  if (Object.keys(patch).length > 0) {
    await admin.from("auszubildende").update(patch).eq("id", primaryId);
  }

  // Step 5b: Sync LearnWorlds. The DB now says A owns every booking
  // that was previously B's, but LW still has TWO user accounts —
  // A's and B's — each enrolled separately in their own purchases.
  // For A's email to actually have access to the courses A absorbed,
  // we have to call enrollInLearnWorlds(A.email, lwCourseId) for
  // every course attached to a moved booking that has an
  // online_course_id on its template. Failures are non-fatal: we log
  // them, surface a non-blocking warning in the response, but still
  // proceed with deleting B. The admin can re-enroll manually via
  // the LMS-Zugriff panel on A's profile.
  const lwEnrollments: { lwCourseId: string; ok: boolean; error?: string }[] = [];
  if (aRow.email) {
    const { data: aBookings } = await admin
      .from("course_bookings")
      .select("template_id, course_templates(online_course_id)")
      .eq("auszubildende_id", primaryId);
    const lwCourseIds = new Set<string>();
    for (const bk of aBookings ?? []) {
      const tmpl = Array.isArray(bk.course_templates)
        ? bk.course_templates[0]
        : bk.course_templates;
      const lwCourseId = tmpl?.online_course_id;
      if (typeof lwCourseId === "string" && lwCourseId.length > 0) {
        lwCourseIds.add(lwCourseId);
      }
    }
    for (const lwCourseId of lwCourseIds) {
      try {
        await enrollInLearnWorlds(
          aRow.email,
          lwCourseId,
          aRow.first_name ?? undefined,
          aRow.last_name ?? undefined,
        );
        lwEnrollments.push({ lwCourseId, ok: true });
      } catch (err) {
        lwEnrollments.push({
          lwCourseId,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // Step 6: Delete B. At this point B has no incoming references
  // (emails/bookings/merch all moved in steps 2-4).
  const { error: delErr } = await admin
    .from("auszubildende")
    .delete()
    .eq("id", mergedId);
  if (delErr) {
    return NextResponse.json(
      {
        error: `Daten wurden zusammengeführt, aber Quell-Profil konnte nicht gelöscht werden: ${delErr.message}`,
        partial: true,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    primaryId,
    mergedId,
    emailsMoved: emailsMoved ?? 0,
    bookingsMoved: bookingsMoved ?? 0,
    ordersMoved: ordersMoved ?? 0,
    fieldsUpdated: Object.keys(patch).length,
    lwEnrollments,
  });
}

// ── Patient (Proband:in) merge ──────────────────────────────────────────────
//
// Patient PII is E2EE-encrypted, so the field merge runs on decrypted data
// and re-encrypts A's blob once at the end. Everything that points at B by
// patient_id (treatment bookings, email aliases, the proband review) moves
// to A first so B can be deleted cleanly.

// Restrictiveness order so a merge can never let someone escape a blacklist
// or warning by folding them into an active profile. "inactive" (no-email)
// is intentionally NOT escalated onto an active survivor — the opt-out lives
// on B's now-secondary email, not on A's primary contact address.
const STATUS_RANK: Record<PatientStatus, number> = {
  active: 0,
  inactive: 0,
  warning: 1,
  blacklist: 2,
};

async function mergePatient(
  admin: SupabaseClient,
  primaryId: string,
  mergedId: string,
): Promise<NextResponse> {
  const [{ data: aRaw }, { data: bRaw }] = await Promise.all([
    admin.from("patients").select("*").eq("id", primaryId).maybeSingle(),
    admin.from("patients").select("*").eq("id", mergedId).maybeSingle(),
  ]);

  if (!aRaw || !bRaw) {
    return NextResponse.json(
      { error: "Mindestens eine:r der Proband:innen wurde nicht gefunden" },
      { status: 404 },
    );
  }

  let a, b;
  try {
    a = decryptPatient(aRaw);
    b = decryptPatient(bRaw);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Entschlüsselung fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 },
    );
  }

  // Step 1: Reassign B's treatment bookings to A (preserves history under A).
  const { count: bookingsMoved } = await admin
    .from("bookings")
    .update({ patient_id: primaryId }, { count: "exact" })
    .eq("patient_id", mergedId);

  // Step 2: Email aliases. Demote B's primary so A doesn't end up with two
  // primaries (partial unique index patient_email_hashes_one_primary), then
  // reassign B's rows to A. UNIQUE(email_hash) means any address B shared
  // with A was rejected at insert, so reassigning never collides.
  await admin
    .from("patient_email_hashes")
    .update({ is_primary: false })
    .eq("patient_id", mergedId)
    .eq("is_primary", true);

  const { count: aliasesMovedRaw } = await admin
    .from("patient_email_hashes")
    .update({ patient_id: primaryId, source: "merge" }, { count: "exact" })
    .eq("patient_id", mergedId);
  let aliasesMoved = aliasesMovedRaw ?? 0;

  // Step 2b: Guarantee B's primary email is resolvable under A even if B
  // never had a patient_email_hashes row (legacy / pre-backfill). The inbox
  // resolves a conversation to a patient via this table, so without an alias
  // row B's email history wouldn't follow into A.
  if (b.email) {
    const bHash = hashEmail(b.email);
    if (bHash !== aRaw.email_hash) {
      const { data: existsRow } = await admin
        .from("patient_email_hashes")
        .select("id")
        .eq("email_hash", bHash)
        .maybeSingle();
      if (!existsRow) {
        const enc = encryptFields({ email: b.email });
        const { error: insErr } = await admin.from("patient_email_hashes").insert({
          patient_id: primaryId,
          email_hash: bHash,
          encrypted_email: enc.encrypted_data,
          encrypted_key: enc.encrypted_key,
          encryption_iv: enc.encryption_iv,
          is_primary: false,
          source: "merge",
        });
        if (!insErr) aliasesMoved += 1;
      }
    }
  }

  // Step 3: proband_reviews has a UNIQUE(patient_id). Keep A's review; only
  // if A has none and B has one do we move B's over. Otherwise B's review
  // cascade-deletes with B in step 6.
  let reviewMoved = 0;
  const { data: aReview } = await admin
    .from("proband_reviews")
    .select("id")
    .eq("patient_id", primaryId)
    .maybeSingle();
  if (!aReview) {
    const { count } = await admin
      .from("proband_reviews")
      .update({ patient_id: primaryId }, { count: "exact" })
      .eq("patient_id", mergedId);
    reviewMoved = count ?? 0;
  }

  // Step 4: Campaign audience arrays carry patient UUIDs as strings. Repoint
  // B → A (dedup) so a suppression (excluded) or inclusion intent survives
  // the merge instead of pointing at a deleted id. Best-effort, non-fatal.
  let campaignsPatched = 0;
  const { data: campaigns } = await admin
    .from("email_campaigns")
    .select("id, excluded_patient_ids, included_patient_ids");
  const repoint = (arr: unknown): { next: string[]; changed: boolean } => {
    if (!Array.isArray(arr) || !arr.includes(mergedId)) {
      return { next: (arr as string[]) ?? [], changed: false };
    }
    const next = (arr as string[]).filter((x) => x !== mergedId);
    if (!next.includes(primaryId)) next.push(primaryId);
    return { next, changed: true };
  };
  for (const c of campaigns ?? []) {
    const ex = repoint(c.excluded_patient_ids);
    const inc = repoint(c.included_patient_ids);
    if (ex.changed || inc.changed) {
      await admin
        .from("email_campaigns")
        .update({
          excluded_patient_ids: ex.next,
          included_patient_ids: inc.next,
        })
        .eq("id", c.id);
      campaignsPatched++;
    }
  }

  // Step 5: Field merge on decrypted data. A wins; A's empty fields fall back
  // to B. Email (the identity) always stays A's. Notes are concatenated.
  const filled = (av: string | null, bv: string | null) =>
    isEmpty(av) && !isEmpty(bv) ? bv : av;
  const mergedNotes = isEmpty(b.notes)
    ? a.notes
    : isEmpty(a.notes)
      ? b.notes
      : `${a.notes}\n\n--- Zusammengeführt von ${b.email || "anderem Profil"} ---\n${b.notes}`;

  const mergedFields = {
    email: a.email,
    first_name: filled(a.first_name, b.first_name),
    last_name: filled(a.last_name, b.last_name),
    phone: filled(a.phone, b.phone),
    address_street: filled(a.address_street, b.address_street),
    address_zip: filled(a.address_zip, b.address_zip),
    address_city: filled(a.address_city, b.address_city),
    stripe_customer_id: filled(a.stripe_customer_id, b.stripe_customer_id),
    notes: mergedNotes,
  };

  // Count which encrypted fields actually changed (for the response only).
  const fieldsUpdated = (
    ["first_name", "last_name", "phone", "address_street", "address_zip", "address_city", "stripe_customer_id"] as const
  ).filter((k) => (mergedFields[k] ?? null) !== (a[k] ?? null)).length;

  const enc = encryptPatientFields(mergedFields);

  // Status: more restrictive of the two survives (see STATUS_RANK).
  const mergedStatus =
    STATUS_RANK[b.patient_status] > STATUS_RANK[a.patient_status]
      ? b.patient_status
      : a.patient_status;

  const { error: updErr } = await admin
    .from("patients")
    .update({
      encrypted_data: enc.encrypted_data,
      encrypted_key: enc.encrypted_key,
      encryption_iv: enc.encryption_iv,
      email_hash: enc.email_hash, // unchanged: A's email is the identity
      phone_hash: enc.phone_hash, // may now be populated from B
      patient_status: mergedStatus,
    })
    .eq("id", primaryId);
  if (updErr) {
    return NextResponse.json(
      {
        error: `Verknüpfung erfolgt, aber das verbleibende Profil konnte nicht aktualisiert werden: ${updErr.message}`,
        partial: true,
      },
      { status: 500 },
    );
  }

  // Step 6: Delete B. Its remaining FKs (leftover email aliases, its review)
  // cascade-delete; bookings already moved in step 1.
  const { error: delErr } = await admin
    .from("patients")
    .delete()
    .eq("id", mergedId);
  if (delErr) {
    return NextResponse.json(
      {
        error: `Daten wurden zusammengeführt, aber das Quell-Profil konnte nicht gelöscht werden: ${delErr.message}`,
        partial: true,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    primaryId,
    mergedId,
    bookingsMoved: bookingsMoved ?? 0,
    emailsMoved: aliasesMoved,
    reviewMoved,
    campaignsPatched,
    fieldsUpdated,
  });
}

// ── Route handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const source = body.source as MergeSource | undefined;
  const primaryId = body.primaryId as string | undefined;
  const mergedId = body.mergedId as string | undefined;

  if (!source || !primaryId || !mergedId) {
    return NextResponse.json(
      { error: "source, primaryId, mergedId required" },
      { status: 400 },
    );
  }
  if (primaryId === mergedId) {
    return NextResponse.json(
      { error: "primaryId und mergedId müssen unterschiedlich sein" },
      { status: 400 },
    );
  }
  if (source !== "auszubildende" && source !== "patient") {
    return NextResponse.json(
      { error: "Unbekannte Merge-Quelle" },
      { status: 400 },
    );
  }

  // Patient profiles hold E2EE PII and the merge hard-deletes a record, so
  // gate it behind a verified-admin check (never the forgeable cookie).
  // The auszubildende path keeps its existing authenticated-staff gate.
  if (source === "patient") {
    const access = await requireVerifiedAdmin();
    if (!access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  const admin = createAdminClient();
  return source === "patient"
    ? mergePatient(admin, primaryId, mergedId)
    : mergeAuszubildende(admin, primaryId, mergedId);
}
