import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedDozent } from "@/lib/auth-verify";
import { createAdminClient } from "@/lib/supabase/admin";

// A Dozent:in raises (or withdraws) their hand for a proposed course date.
// The applicant is ALWAYS the verified caller — profile_id is taken from
// the validated session, never from the request body, so nobody can apply
// on someone else's behalf. Double bookings across different proposals are
// allowed; the unique(proposal_id, profile_id) constraint only stops a
// duplicate application to the same date.

interface Body {
  proposalId?: string;
  action?: "apply" | "withdraw";
  note?: string | null;
}

export async function POST(req: NextRequest) {
  const access = await requireVerifiedDozent();
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
  const action = body.action === "withdraw" ? "withdraw" : "apply";
  if (!proposalId) {
    return NextResponse.json({ error: "proposalId required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Only open proposals accept application changes.
  const { data: proposal } = await admin
    .from("course_date_proposals")
    .select("id, status")
    .eq("id", proposalId)
    .maybeSingle();
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.status !== "open") {
    return NextResponse.json(
      { error: "Dieser Termin nimmt keine Bewerbungen mehr an." },
      { status: 409 },
    );
  }

  if (action === "withdraw") {
    const { error } = await admin
      .from("course_date_applications")
      .delete()
      .eq("proposal_id", proposalId)
      .eq("profile_id", access.userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, applied: false });
  }

  // Apply. Upsert on the unique (proposal_id, profile_id) so a repeated
  // tap is idempotent and re-applying after a withdraw resets status.
  const { error } = await admin
    .from("course_date_applications")
    .upsert(
      {
        proposal_id: proposalId,
        profile_id: access.userId,
        status: "applied",
        note: body.note?.trim() || null,
      },
      { onConflict: "proposal_id,profile_id" },
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, applied: true });
}
