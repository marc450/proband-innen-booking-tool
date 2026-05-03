import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin-triggered manual password set for an auszubildende.
//
// Used when the recovery-email flow doesn't work (customer's email
// undeliverable, on the phone with support, etc.). Admin types the
// new password directly; we update the auth user and log it.
//
// We DO NOT email the customer — Marc may want to communicate the
// password verbally. The audit log makes the action retraceable.
//
// 400 conditions:
//   - missing or short password
//   - target has no user_id (no login to set a password on)

const MIN_PASSWORD_LENGTH = 8;

interface RequestBody {
  password?: string;
}

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") return user;
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const password = body.password ?? "";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.` },
      { status: 400 },
    );
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: contact } = await admin
    .from("auszubildende")
    .select("id, email, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!contact) {
    return NextResponse.json({ error: "Auszubildende nicht gefunden." }, { status: 404 });
  }
  if (!contact.user_id) {
    return NextResponse.json(
      {
        error:
          "Diese Person hat noch kein Login-Konto. Bitte aktiviere es zuerst über /start.",
      },
      { status: 400 },
    );
  }

  const { error: updateErr } = await admin.auth.admin.updateUserById(
    contact.user_id,
    { password },
  );

  await admin.from("admin_actions").insert({
    actor_id: caller.id,
    action_type: "password_manual_set",
    target_table: "auszubildende",
    target_id: contact.id,
    metadata: {
      // Don't log the password itself, obviously. The metadata records
      // that a manual set happened, not what the value was.
      auth_user_id: contact.user_id,
      ok: !updateErr,
      error: updateErr?.message ?? null,
    },
  });

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
