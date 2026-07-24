import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedAdmin } from "@/lib/auth-verify";
import { createAdminClient } from "@/lib/supabase/admin";

// Delete a Kurstermin EVERYWHERE, in one deliberate step.
//
// Why this exists: the dashboard used to delete course_sessions straight
// from the browser client and swallow the error. Two things went wrong.
//   1. course_bookings.session_id has no ON DELETE clause (NO ACTION), so
//      a Termin with Ärzt:innen-Buchungen could not be deleted at all and
//      the UI silently did nothing.
//   2. Everything else IS ON DELETE CASCADE (course_sessions → courses →
//      slots → bookings), so a delete that DID go through silently
//      destroyed Proband:innen-Buchungen with no warning.
//
// So this route runs in two modes. `preview` reports exactly what would be
// destroyed, which the dashboard shows in the confirm dialog; `delete`
// performs it. Service-role client throughout (bypasses RLS, so the delete
// can't silently affect zero rows the way the browser client did), gated on
// a verified admin.

interface Body {
  sessionId?: string;
  mode?: "preview" | "delete";
}

interface Impact {
  aerzteBookings: number;
  probandBookings: number;
  probandSlots: number;
  hasSatellite: boolean;
}

// Statuses that count as an ACTIVE registration. Cancelled/refunded/no-show
// rows still live in the tables (and still get removed on delete), but they
// aren't registrations, so the confirm dialog must not report them as
// "aktuell gebucht". These mirror how the rest of the app counts seats
// (e.g. the available_slots view uses booked/attended for Proband:innen).
const ACTIVE_PROBAND_STATUSES = ["booked", "attended"];
const ACTIVE_AERZTE_STATUSES = ["booked", "completed"];

async function collectImpact(
  admin: ReturnType<typeof createAdminClient>,
  sessionId: string,
): Promise<Impact> {
  // Ärzt:innen side — active registrations only.
  const { data: courseBookings } = await admin
    .from("course_bookings")
    .select("id")
    .eq("session_id", sessionId)
    .in("status", ACTIVE_AERZTE_STATUSES);

  // Proband:innen side: satellite course → slots → bookings.
  const { data: satellites } = await admin
    .from("courses")
    .select("id")
    .eq("session_id", sessionId);
  const courseIds = (satellites ?? []).map((c) => c.id as string);

  let probandSlots = 0;
  let probandBookings = 0;
  if (courseIds.length) {
    const { data: slots } = await admin
      .from("slots")
      .select("id")
      .in("course_id", courseIds);
    const slotIds = (slots ?? []).map((s) => s.id as string);
    probandSlots = slotIds.length;
    if (slotIds.length) {
      const { data: bookings } = await admin
        .from("bookings")
        .select("id")
        .in("slot_id", slotIds)
        .in("status", ACTIVE_PROBAND_STATUSES);
      probandBookings = (bookings ?? []).length;
    }
  }

  return {
    aerzteBookings: (courseBookings ?? []).length,
    probandBookings,
    probandSlots,
    hasSatellite: courseIds.length > 0,
  };
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
  const sessionId = (body.sessionId ?? "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: session } = await admin
    .from("course_sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "Termin nicht gefunden." }, { status: 404 });
  }

  const impact = await collectImpact(admin, sessionId);

  if (body.mode !== "delete") {
    return NextResponse.json({ ok: true, impact });
  }

  // ── Perform the delete ──────────────────────────────────────────────
  // course_bookings must go first: its FK to course_sessions is NO ACTION
  // and would otherwise block the whole delete. Everything else is removed
  // by the ON DELETE CASCADE chain when the session row goes.
  //
  // Runs unconditionally over ALL statuses. `impact.aerzteBookings` now only
  // tallies ACTIVE bookings, so it can no longer gate this step: a session
  // whose only course_bookings are cancelled/refunded would report 0 active
  // yet still carry FK rows that must be cleared first, or the session delete
  // below fails. Deleting zero matching rows is a harmless no-op.
  const { error: cbErr } = await admin
    .from("course_bookings")
    .delete()
    .eq("session_id", sessionId);
  if (cbErr) {
    return NextResponse.json(
      { error: `Ärzt:innen-Buchungen konnten nicht gelöscht werden: ${cbErr.message}` },
      { status: 500 },
    );
  }

  const { error: sessionErr } = await admin
    .from("course_sessions")
    .delete()
    .eq("id", sessionId);
  if (sessionErr) {
    return NextResponse.json(
      { error: `Termin konnte nicht gelöscht werden: ${sessionErr.message}` },
      { status: 500 },
    );
  }

  // Verify the cascade actually cleared the Proband:innen side, so a
  // leftover published course can never stay bookable after a "delete".
  const { data: leftover } = await admin
    .from("courses")
    .select("id")
    .eq("session_id", sessionId);
  if ((leftover ?? []).length > 0) {
    return NextResponse.json({
      ok: true,
      impact,
      warning:
        "Termin gelöscht, aber der Proband:innen-Kurs existiert noch. Bitte im Support melden.",
    });
  }

  return NextResponse.json({ ok: true, impact });
}
