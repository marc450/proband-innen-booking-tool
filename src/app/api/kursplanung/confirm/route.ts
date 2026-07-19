import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedAdmin } from "@/lib/auth-verify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSatelliteForSession } from "@/lib/auto-create-satellite";
import { parseDateOnly } from "@/lib/date";

// Admin picks one applicant for a proposed date and confirms it. This is
// the payoff of the whole flow: it creates a real course_sessions row set
// to is_live = false (offline by default) with the selected Dozent:in as
// instructor, then spawns the Proband:innen satellite (courses + slots)
// through the same createSatelliteForSession the manual "Neuen Termin
// erstellen" path uses — so the new date shows up in Termine > Kurse
// exactly like a hand-created one, just offline until an admin flips it.

const MONTHS_DE = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];

// Matches dateToLabelDe in course-sessions-manager so labels are uniform
// ("16. Aug 2026") across manually created and confirmed sessions.
function dateToLabelDe(dateIso: string): string {
  const d = parseDateOnly(dateIso);
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

function dozentDisplayName(p: {
  title: string | null;
  first_name: string | null;
  last_name: string | null;
}): string {
  return [p.title, p.first_name, p.last_name].filter(Boolean).join(" ");
}

interface Body {
  proposalId?: string;
  applicationId?: string;
}

export async function POST(req: NextRequest) {
  const access = await requireVerifiedAdmin();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const proposalId = (body.proposalId ?? "").trim();
  const applicationId = (body.applicationId ?? "").trim();
  if (!proposalId || !applicationId) {
    return NextResponse.json(
      { error: "proposalId and applicationId are required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: proposal } = await admin
    .from("course_date_proposals")
    .select(
      "id, status, template_id, proposed_date, start_time, duration_minutes, max_seats, address",
    )
    .eq("id", proposalId)
    .maybeSingle();
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.status !== "open") {
    return NextResponse.json(
      { error: "Dieser Termin wurde bereits bestätigt oder abgesagt." },
      { status: 409 },
    );
  }

  // The chosen application must belong to this proposal.
  const { data: application } = await admin
    .from("course_date_applications")
    .select("id, profile_id, proposal_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application || application.proposal_id !== proposalId) {
    return NextResponse.json(
      { error: "Application does not belong to this proposal" },
      { status: 400 },
    );
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, title, first_name, last_name")
    .eq("id", application.profile_id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json(
      { error: "Selected Dozent:in profile not found" },
      { status: 400 },
    );
  }
  const instructorName = dozentDisplayName(profile);

  // 1) Create the offline course_sessions row (mirrors handleCreate in
  //    course-sessions-manager: is_live defaults to false).
  const dateIso = proposal.proposed_date as string;
  const { data: session, error: sessionErr } = await admin
    .from("course_sessions")
    .insert({
      template_id: proposal.template_id,
      date_iso: dateIso,
      label_de: dateToLabelDe(dateIso),
      instructor_name: instructorName || null,
      max_seats: proposal.max_seats ?? 5,
      booked_seats: 0,
      address: proposal.address || null,
      start_time: proposal.start_time || null,
      duration_minutes: proposal.duration_minutes || null,
      is_live: false,
    })
    .select("id")
    .single();
  if (sessionErr || !session) {
    return NextResponse.json(
      { error: sessionErr?.message || "session insert failed" },
      { status: 500 },
    );
  }

  // 2) Spawn the Proband:innen satellite (courses + slots). A failure here
  //    is non-fatal: the session exists and an admin can create the
  //    satellite from the detail page, so we surface a warning rather than
  //    rolling back a valid session.
  const satellite = await createSatelliteForSession(session.id as string);

  // 3) Flip proposal + applications to their terminal states.
  await admin
    .from("course_date_proposals")
    .update({
      status: "confirmed",
      assigned_profile_id: application.profile_id,
      created_session_id: session.id,
    })
    .eq("id", proposalId);

  // Selected applicant → 'selected', everyone else on this proposal →
  // 'declined'. Two updates keep it simple and the row count is tiny.
  await admin
    .from("course_date_applications")
    .update({ status: "declined" })
    .eq("proposal_id", proposalId)
    .neq("id", applicationId);
  await admin
    .from("course_date_applications")
    .update({ status: "selected" })
    .eq("id", applicationId);

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    instructorName,
    satellite: satellite.ok
      ? { ok: true, slotsCreated: satellite.slotsCreated }
      : { ok: false, reason: satellite.reason },
  });
}
