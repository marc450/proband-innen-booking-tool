import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedAdmin } from "@/lib/auth-verify";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin CRUD for open course-date proposals. Dozent:innen apply to these
// via /api/kursplanung/apply; admins confirm via /api/kursplanung/confirm.
// All writes go through the service-role admin client after a verified
// admin check (never trusting the x-user-role cookie).

interface CreateBody {
  templateId?: string;
  proposedDate?: string; // YYYY-MM-DD
  startTime?: string;
  durationMinutes?: number;
  maxSeats?: number;
  address?: string | null;
  notes?: string | null;
}

export async function POST(req: NextRequest) {
  const access = await requireVerifiedAdmin();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const templateId = (body.templateId ?? "").trim();
  const proposedDate = (body.proposedDate ?? "").trim();
  if (!templateId || !proposedDate) {
    return NextResponse.json(
      { error: "templateId and proposedDate are required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("course_date_proposals")
    .insert({
      template_id: templateId,
      proposed_date: proposedDate,
      start_time: (body.startTime ?? "10:00").trim() || "10:00",
      duration_minutes: Number.isFinite(body.durationMinutes)
        ? body.durationMinutes
        : 360,
      max_seats: Number.isFinite(body.maxSeats) ? body.maxSeats : 5,
      address: body.address?.trim() || null,
      notes: body.notes?.trim() || null,
      created_by: access.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "insert failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: data.id });
}

interface DeleteBody {
  proposalId?: string;
}

export async function DELETE(req: NextRequest) {
  const access = await requireVerifiedAdmin();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: DeleteBody;
  try {
    body = (await req.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const proposalId = (body.proposalId ?? "").trim();
  if (!proposalId) {
    return NextResponse.json({ error: "proposalId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  // Applications cascade via the FK. Deleting a proposal does NOT touch any
  // course_sessions already created from it (confirm sets created_session_id
  // with ON DELETE SET NULL), so a confirmed session survives independently.
  const { error } = await admin
    .from("course_date_proposals")
    .delete()
    .eq("id", proposalId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
