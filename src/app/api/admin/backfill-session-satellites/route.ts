import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSatelliteForSession, type SatelliteResult } from "@/lib/auto-create-satellite";

// One-shot admin endpoint to create Proband:innen satellites for every
// future course_sessions row that doesn't have one yet. Pass
// { dryRun: true } to preview the planned slot timestamps without
// writing. Idempotent: only acts on sessions still missing a satellite.

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "admin" ? user : null;
}

interface RequestBody {
  dryRun?: boolean;
}

export async function POST(req: NextRequest) {
  const caller = await assertAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: RequestBody = {};
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    body = {};
  }

  const dryRun = body.dryRun === true;
  const admin = createAdminClient();

  const { data: candidateSessions, error } = await admin
    .from("course_sessions")
    .select("id, date_iso, template_id")
    .gt("date_iso", new Date().toISOString().slice(0, 10))
    .order("date_iso", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter to sessions WITHOUT a satellite. Done in JS rather than SQL
  // because Supabase doesn't expose anti-joins cleanly.
  const { data: linkedSessions } = await admin
    .from("courses")
    .select("session_id")
    .not("session_id", "is", null);
  const linkedIds = new Set(
    (linkedSessions ?? []).map((r) => r.session_id as string),
  );
  const inScope = (candidateSessions ?? []).filter((s) => !linkedIds.has(s.id as string));

  const backfilled: SatelliteResult[] = [];
  const skipped: SatelliteResult[] = [];

  for (const session of inScope) {
    const result = await createSatelliteForSession(session.id as string, { dryRun });
    if (result.ok) backfilled.push(result);
    else skipped.push(result);
  }

  return NextResponse.json({
    dryRun,
    inScopeCount: inScope.length,
    backfilledCount: backfilled.length,
    skippedCount: skipped.length,
    backfilled,
    skipped,
  });
}
