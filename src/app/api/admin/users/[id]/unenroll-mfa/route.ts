import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin escape hatch: nukes ALL MFA factors of another staff user.
// Used when a colleague loses their phone / authenticator-app data and
// can't log in anymore. The next login is back to password-only; if
// they're still admin, the middleware will force them through
// /setup-2fa to enroll a new factor.
//
// Caller MUST be admin role. Self-unenroll is not handled here — that
// goes through supabase.auth.mfa.unenroll() from the user's own
// session via Manage2faDialog.
//
// Logged in admin_actions for audit. Same shape as the existing
// password-reset audit at
// src/app/api/admin/auszubildende/[id]/password-reset/route.ts.

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: targetUserId } = await params;

  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: factorList, error: lErr } =
    await admin.auth.admin.mfa.listFactors({ userId: targetUserId });
  if (lErr) {
    return NextResponse.json({ error: lErr.message }, { status: 500 });
  }

  const factors = factorList?.factors ?? [];
  const errors: string[] = [];
  for (const f of factors) {
    const { error: dErr } = await admin.auth.admin.mfa.deleteFactor({
      userId: targetUserId,
      id: f.id,
    });
    if (dErr) errors.push(dErr.message);
  }

  await admin.from("admin_actions").insert({
    actor_id: caller.id,
    action_type: "mfa_unenroll",
    target_table: "profiles",
    target_id: targetUserId,
    metadata: {
      factor_count: factors.length,
      ok: errors.length === 0,
      errors,
    },
  });

  if (errors.length > 0) {
    return NextResponse.json(
      { error: `Teilweise fehlgeschlagen: ${errors.join("; ")}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, count: factors.length });
}
