import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/submit-proband-review
// Public endpoint. Validates the proband's review_submit_token, then writes a
// proband_reviews row with is_published=false. Idempotent via the UNIQUE
// constraint on proband_reviews.patient_id (a second submit yields a 409).
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { token, rating, firstName, bodyText } = (body || {}) as {
    token?: unknown;
    rating?: unknown;
    firstName?: unknown;
    bodyText?: unknown;
  };

  if (typeof token !== "string" || token.length < 8) {
    return NextResponse.json({ error: "Link ungültig." }, { status: 400 });
  }
  const ratingNum = typeof rating === "number" ? rating : Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json(
      { error: "Bitte vergib zwischen 1 und 5 Sternen." },
      { status: 400 },
    );
  }
  if (typeof firstName !== "string" || firstName.trim().length === 0) {
    return NextResponse.json(
      { error: "Bitte gib Deinen Vornamen an." },
      { status: 400 },
    );
  }
  const trimmedFirstName = firstName.trim().slice(0, 80);
  const trimmedBody =
    typeof bodyText === "string" ? bodyText.trim().slice(0, 2000) : "";
  // Body text is required: a reine Sterne-Bewertung ohne Worte sagt uns
  // nichts. Doubled with the client-side canSubmit gate so a direct POST
  // can't bypass it.
  if (trimmedBody.length === 0) {
    return NextResponse.json(
      {
        error:
          "Bitte schreibe ein paar Worte zu Deiner Erfahrung bei EPHIA.",
      },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: patient, error: patientErr } = await supabase
    .from("patients")
    .select("id")
    .eq("review_submit_token", token)
    .maybeSingle();

  if (patientErr) {
    console.error("submit-proband-review: patient lookup failed", patientErr);
    return NextResponse.json(
      { error: "Da ist etwas schiefgelaufen." },
      { status: 500 },
    );
  }
  if (!patient) {
    return NextResponse.json({ error: "Link ungültig." }, { status: 404 });
  }

  const { error: insertErr } = await supabase.from("proband_reviews").insert({
    patient_id: patient.id,
    rating: ratingNum,
    first_name: trimmedFirstName,
    body_text: trimmedBody,
    is_published: false,
  });

  if (insertErr) {
    // 23505 = unique violation on proband_reviews.patient_id (one review per
    // proband), catches double submissions.
    if (insertErr.code === "23505") {
      return NextResponse.json(
        { error: "Für diesen Link wurde bereits eine Bewertung abgegeben." },
        { status: 409 },
      );
    }
    console.error("submit-proband-review: insert failed", insertErr);
    return NextResponse.json(
      { error: "Da ist etwas schiefgelaufen." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
