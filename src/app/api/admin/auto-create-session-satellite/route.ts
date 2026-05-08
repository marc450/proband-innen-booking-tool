import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSatelliteForSession } from "@/lib/auto-create-satellite";

// Called by the dashboard course-sessions-manager right after a new
// session is inserted. Wraps createSatelliteForSession so the same
// pattern-lookup + slot-insertion logic is shared with the one-shot
// backfill tool — single source of truth for satellite creation.

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
  sessionId?: string;
}

export async function POST(req: NextRequest) {
  const caller = await assertAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const sessionId = (body.sessionId ?? "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const result = await createSatelliteForSession(sessionId);
  return NextResponse.json(result);
}
