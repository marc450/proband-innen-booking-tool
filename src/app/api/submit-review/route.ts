import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/submit-review
// Public endpoint. Validates the booking's review_submit_token, then writes
// a course_reviews row with is_published=false. Idempotent on the booking
// side via the UNIQUE constraint on course_reviews.booking_id (a second
// submit yields a 409 instead of a duplicate row).
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const {
    token,
    rating,
    firstName,
    bodyText,
    internalFeedback,
  } = (body || {}) as {
    token?: unknown;
    rating?: unknown;
    firstName?: unknown;
    bodyText?: unknown;
    internalFeedback?: unknown;
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
  // Body text is now required. A reine Sterne-Bewertung ohne Worte
  // bringt weder uns noch anderen Ärzt:innen etwas, also lehnen wir
  // sie an dieser Stelle ab (Marc-Entscheidung 2026-05-31). Doppelt
  // mit der client-seitigen canSubmit-Prüfung, damit ein direkter
  // POST den Gate nicht umgehen kann.
  if (trimmedBody.length === 0) {
    return NextResponse.json(
      {
        error:
          "Bitte schreibe ein paar Worte, was Du anderen Ärzt:innen über diesen Kurs sagen möchtest.",
      },
      { status: 400 },
    );
  }
  const trimmedInternal =
    typeof internalFeedback === "string"
      ? internalFeedback.trim().slice(0, 4000)
      : "";

  const supabase = createAdminClient();

  const { data: booking, error: bookingErr } = await supabase
    .from("course_bookings")
    .select("id, template_id, review_request_general")
    .eq("review_submit_token", token)
    .maybeSingle();

  if (bookingErr) {
    console.error("submit-review: booking lookup failed", bookingErr);
    return NextResponse.json(
      { error: "Da ist etwas schiefgelaufen." },
      { status: 500 },
    );
  }

  // Two token populations coexist: legacy booking-anchored tokens (already
  // sitting in inboxes) and the doctor-anchored token on `auszubildende`
  // (the one-time "alle Teilnehmer:innen anschreiben" pass). Booking tokens
  // win the lookup; if there's no booking, fall back to the doctor token.
  if (booking) {
    // General requests (one-time bulk past-attendee pass) produce a
    // course-agnostic review: template_id stays null so /kurse/[slug] renders
    // it in the shared pool without a per-card "Bewertung zum Kurs X" label.
    const reviewTemplateId = booking.review_request_general
      ? null
      : booking.template_id;

    const { error: insertErr } = await supabase.from("course_reviews").insert({
      booking_id: booking.id,
      template_id: reviewTemplateId,
      rating: ratingNum,
      first_name: trimmedFirstName,
      body_text: trimmedBody,
      is_published: false,
    });

    if (insertErr) {
      // 23505 = unique violation. The UNIQUE constraint on
      // course_reviews.booking_id catches double submissions even if the
      // page-level "already submitted" check was bypassed.
      if (insertErr.code === "23505") {
        return NextResponse.json(
          { error: "Für diese Buchung wurde bereits eine Bewertung abgegeben." },
          { status: 409 },
        );
      }
      console.error("submit-review: insert failed", insertErr);
      return NextResponse.json(
        { error: "Da ist etwas schiefgelaufen." },
        { status: 500 },
      );
    }

    // Anonymes Team-Feedback goes into its own table with no booking_id
    // and a day-level date so it can't be correlated back to this
    // specific reviewer. Best-effort: a failure here doesn't roll back
    // the public review — the doctor still gets credit for submitting.
    // course_internal_feedback.template_id is NOT NULL, so we only insert
    // when the booking actually has a template.
    if (trimmedInternal && booking.template_id) {
      const { error: feedbackErr } = await supabase
        .from("course_internal_feedback")
        .insert({
          template_id: booking.template_id,
          body: trimmedInternal,
        });
      if (feedbackErr) {
        console.error("submit-review: internal feedback insert failed", feedbackErr);
      }
    }

    return NextResponse.json({ ok: true });
  }

  // Doctor-anchored token path. The review hangs off the doctor directly:
  // booking_id and template_id stay null (course-agnostic, shared pool).
  const { data: doctor, error: doctorErr } = await supabase
    .from("auszubildende")
    .select("id")
    .eq("review_submit_token", token)
    .maybeSingle();

  if (doctorErr) {
    console.error("submit-review: doctor lookup failed", doctorErr);
    return NextResponse.json(
      { error: "Da ist etwas schiefgelaufen." },
      { status: 500 },
    );
  }
  if (!doctor) {
    return NextResponse.json({ error: "Link ungültig." }, { status: 404 });
  }

  const { error: doctorInsertErr } = await supabase
    .from("course_reviews")
    .insert({
      auszubildende_id: doctor.id,
      booking_id: null,
      template_id: null,
      rating: ratingNum,
      first_name: trimmedFirstName,
      body_text: trimmedBody,
      is_published: false,
    });

  if (doctorInsertErr) {
    // 23505 = unique violation on course_reviews.auszubildende_id (one
    // general review per doctor), catches double submissions.
    if (doctorInsertErr.code === "23505") {
      return NextResponse.json(
        { error: "Für diesen Link wurde bereits eine Bewertung abgegeben." },
        { status: 409 },
      );
    }
    console.error("submit-review: doctor insert failed", doctorInsertErr);
    return NextResponse.json(
      { error: "Da ist etwas schiefgelaufen." },
      { status: 500 },
    );
  }

  // Doctor-anchored reviews have no template, so anonymous team feedback
  // (template_id NOT NULL) cannot be attributed to a course. We skip it
  // rather than drop it into an arbitrary template.

  return NextResponse.json({ ok: true });
}
