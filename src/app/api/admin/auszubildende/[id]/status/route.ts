import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Change an auszubildende's status from the dashboard.
//
// Why this exists as a route instead of a direct browser-side update:
// the auszubildende table's RLS policies silently drop UPDATE rows for
// the `authenticated` role, so the dashboard's optimistic
// supabase.update() returns 204 with no rows changed and the status
// reverts as soon as staff re-opens the profile. Routing through the
// admin client (service_role) bypasses RLS the same way the rest of
// the /api/admin/* tree does.

const ALLOWED_STATUSES = new Set(["active", "warning", "blacklist", "inactive"]);

async function assertStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role === "admin" || profile?.role === "nutzer") return user;
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const caller = await assertStaff();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: { status?: string };
  try {
    body = (await req.json()) as { status?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const newStatus = body.status;
  if (!newStatus || !ALLOWED_STATUSES.has(newStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin
    .from("auszubildende")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status: newStatus });
}
