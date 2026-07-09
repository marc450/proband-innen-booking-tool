import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailHtml } from "@/lib/email-template";

// Admin-triggered password recovery for an auszubildende.
//
// EPHIA-native flow (mirrors src/app/api/admin/request-password-reset
// for staff): we mint the recovery token ourselves via
// admin.auth.admin.generateLink({ type: "recovery" }) — which does NOT
// trigger Supabase's built-in email — and send our own Resend-branded
// message. The link points DIRECTLY at
// https://ephia.de/reset-password?token_hash=...&type=recovery so the
// client-side verifyOtp flow in
// src/app/kurse/reset-password/reset-password-form.tsx consumes the
// hash. This is cross-browser/device safe (no PKCE verifier needed in
// the customer's storage) and the link shape is fully under our
// control, unlike the previous resetPasswordForEmail() approach which
// depended on the Supabase dashboard email template being configured
// just right.
//
// Token TTL is whatever Supabase Auth → Email is configured to
// (default 1 hour). The email text states 1 hour; if you change the
// TTL in Supabase, update the copy below.
//
// 400 when the contact has no Supabase login yet (user_id IS NULL):
// the customer hasn't been through /start to set a password, so there
// is nothing to reset. The UI surfaces this as "Konto noch nicht
// aktiviert" and points the admin at the alternative flow.
//
// Logs every call to admin_actions, including the actor, the
// target, and a metadata blob with the resolved email + outcome.

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// ephia.de is the canonical customer-facing host; the middleware
// rewrites /reset-password to /kurse/reset-password internally.
const REDIRECT_TO = "https://ephia.de/reset-password";

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
    .from("v_auszubildende")
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

  if (!RESEND_API_KEY) {
    return NextResponse.json(
      { error: "E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY fehlt)." },
      { status: 500 },
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

  // Mint the recovery token without triggering Supabase's built-in
  // email. We build the link ourselves so its shape is exactly what the
  // /kurse/reset-password form expects.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: loginEmail,
    options: { redirectTo: REDIRECT_TO },
  });

  const hashedToken = linkData?.properties?.hashed_token;
  if (linkErr || !hashedToken) {
    await admin.from("admin_actions").insert({
      actor_id: caller.id,
      action_type: "password_reset_email",
      target_table: "auszubildende",
      target_id: contact.id,
      metadata: {
        login_email: loginEmail,
        ok: false,
        error: linkErr?.message ?? "generateLink returned no token",
      },
    });
    return NextResponse.json(
      { error: linkErr?.message ?? "Recovery-Link konnte nicht erstellt werden." },
      { status: 500 },
    );
  }

  const resetLink = `${REDIRECT_TO}?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`;

  const html = buildEmailHtml({
    firstName: contact.first_name ?? "",
    intro:
      "Du hast einen Link zum Zurücksetzen Deines Passworts angefordert. Klicke auf den Button unten, um ein neues Passwort zu setzen. Der Link ist 1 Stunde gültig. Wenn Du das nicht warst, kannst Du diese E-Mail einfach ignorieren.",
    buttons: [{ label: "Neues Passwort setzen", url: resetLink }],
  });

  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "EPHIA <customerlove@ephia.de>",
      to: [loginEmail],
      subject: "Passwort zurücksetzen",
      html,
    }),
  });

  const sendOk = sendRes.ok;
  const sendError = sendOk ? null : await sendRes.text().catch(() => "unknown");

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
      ok: sendOk,
      error: sendError,
    },
  });

  if (!sendOk) {
    return NextResponse.json(
      { error: "Reset-E-Mail konnte nicht versendet werden." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, email: loginEmail });
}
