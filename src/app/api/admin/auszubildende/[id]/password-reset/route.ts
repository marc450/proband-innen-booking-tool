import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin-triggered password recovery for an auszubildende.
//
// Sends the same Supabase-branded recovery email that the customer
// would get via /start "Passwort vergessen?" — we use the public
// supabase.auth.resetPasswordForEmail() rather than admin.generateLink
// so the email body is exactly what the customer expects (template
// configured in Supabase, not a raw URL we'd have to email ourselves).
//
// 400 when the contact has no Supabase login yet (user_id IS NULL):
// the customer hasn't been through /start to set a password, so there
// is nothing to reset. The UI surfaces this as "Konto noch nicht
// aktiviert" and points the admin at the alternative flow.
//
// Logs every call to admin_actions, including the actor, the
// target, and a metadata blob with the resolved email + outcome.

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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const caller = await assertAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: contact, error: contactErr } = await admin
    .from("auszubildende")
    .select("id, email, user_id, first_name, last_name")
    .eq("id", id)
    .maybeSingle();
  if (contactErr) {
    return NextResponse.json({ error: contactErr.message }, { status: 500 });
  }
  if (!contact) {
    return NextResponse.json({ error: "Auszubildende nicht gefunden." }, { status: 404 });
  }
  if (!contact.user_id) {
    return NextResponse.json(
      {
        error:
          "Diese Person hat noch kein Login-Konto. Bitte aktiviert sie:r es zuerst über /start.",
      },
      { status: 400 },
    );
  }

  // Resolve the auth user's actual email — it should match
  // contact.email but the customer might have rotated it. Always send
  // to whatever Supabase considers the login address.
  const { data: authUserRes, error: authErr } =
    await admin.auth.admin.getUserById(contact.user_id);
  if (authErr || !authUserRes?.user?.email) {
    return NextResponse.json(
      { error: authErr?.message ?? "Login-Konto konnte nicht aufgelöst werden." },
      { status: 500 },
    );
  }
  const loginEmail = authUserRes.user.email;

  // The redirectTo URL must be allowlisted in Supabase Auth → URL
  // Configuration. We've already added the three reset-password
  // hosts (kurse.ephia.de, ephia.de, localhost) for the customer-
  // initiated flow; reusing them here keeps both flows consistent.
  const redirectTo = "https://ephia.de/reset-password";

  const { error: resetErr } = await admin.auth.resetPasswordForEmail(loginEmail, {
    redirectTo,
  });

  // Log no matter what — successful sends and failures both belong
  // in the audit so we can reconstruct what happened during a
  // support ticket.
  await admin.from("admin_actions").insert({
    actor_id: caller.id,
    action_type: "password_reset_email",
    target_table: "auszubildende",
    target_id: contact.id,
    metadata: {
      login_email: loginEmail,
      ok: !resetErr,
      error: resetErr?.message ?? null,
    },
  });

  if (resetErr) {
    return NextResponse.json({ error: resetErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email: loginEmail });
}
