import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrollInLearnWorlds } from "@/lib/post-purchase";

// Merge contact B into contact A. A's non-empty fields win; B's emails,
// bookings and merch orders all reassign to A; B is deleted at the end.
//
// Sequential rather than transactional. If a step fails mid-way the
// remaining state is benign: A ends up with B's data anyway and the
// orphaned B row can be re-merged or hand-cleaned. The order is chosen
// so that no FK to B is left dangling before B is deleted.

type MergeSource = "auszubildende"; // PR 5 will add "patient"

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

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

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
  if (source !== "auszubildende") {
    return NextResponse.json(
      { error: "Nur Auszubildende-Merge ist aktuell unterstützt" },
      { status: 501 },
    );
  }

  const admin = createAdminClient();

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
    for (const b of aBookings ?? []) {
      const tmpl = Array.isArray(b.course_templates)
        ? b.course_templates[0]
        : b.course_templates;
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

  // Step 6: Delete B. Cascade safety net for any FK we forgot — but at
  // this point B has no incoming references (emails/bookings/merch all
  // moved in steps 2-4) so the delete should clean up cleanly.
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
