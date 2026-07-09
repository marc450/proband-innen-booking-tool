import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailHtml } from "@/lib/email-template";

// Public endpoint behind the customer /start "Passwort vergessen?" link.
// Customer-facing mirror of src/app/api/admin/request-password-reset
// (the staff variant): returns 200 unconditionally so the UI never
// reveals whether an address has an account (enumeration protection).
//
// We mint the recovery token via
// admin.auth.admin.generateLink({ type: "recovery" }) — which does NOT
// trigger Supabase's built-in email — and send our own EPHIA-branded
// Resend message. The link points DIRECTLY at
// https://ephia.de/reset-password?token_hash=...&type=recovery so the
// client-side verifyOtp flow in
// src/app/kurse/reset-password/reset-password-form.tsx consumes the
// hash. Cross-browser/device safe (no PKCE verifier needed in the
// customer's storage) and the link shape is fully under our control,
// unlike the previous supabase.auth.resetPasswordForEmail() call which
// depended on the Supabase dashboard email template.
//
// Token TTL is whatever Supabase Auth → Email is configured to
// (set to 3 hours / 10800s in the Supabase dashboard). The email text
// states 3 hours; if you change the TTL in Supabase, update the copy
// here.

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// ephia.de is the canonical customer-facing host; the middleware
// rewrites /reset-password to /kurse/reset-password internally.
const REDIRECT_TO = "https://ephia.de/reset-password";

export async function POST(req: NextRequest) {
  let email: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.email === "string") email = body.email.trim().toLowerCase();
  } catch {
    // ignore — we always 200
  }

  if (!email) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();

  // generateLink returns a token even for non-existent users in some
  // Supabase versions, so we guard by checking the user object on the
  // response. If the address has no auth user, properties.user is null
  // and we silently skip the send.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: REDIRECT_TO },
  });

  if (error || !data?.user || !data?.properties?.hashed_token) {
    return NextResponse.json({ ok: true });
  }

  if (!RESEND_API_KEY) {
    // Env not configured — nothing else we can do.
    return NextResponse.json({ ok: true });
  }

  // Nicer greeting when we have a name; falls back to an empty greeting
  // otherwise. Never blocks the send.
  const { data: profile } = await admin
    .from("profiles")
    .select("first_name")
    .eq("id", data.user.id)
    .maybeSingle();

  const tokenHash = data.properties.hashed_token;
  const resetLink = `${REDIRECT_TO}?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;

  const html = buildEmailHtml({
    firstName: profile?.first_name ?? "",
    intro:
      "Du hast einen Link zum Zurücksetzen Deines Passworts angefordert. Klicke auf den Button unten, um ein neues Passwort zu setzen. Der Link ist 3 Stunden gültig. Wenn Du das nicht warst, kannst Du diese E-Mail einfach ignorieren.",
    buttons: [{ label: "Neues Passwort setzen", url: resetLink }],
  });

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "EPHIA <customerlove@ephia.de>",
      to: [email],
      subject: "Passwort zurücksetzen",
      html,
    }),
  });

  return NextResponse.json({ ok: true });
}
