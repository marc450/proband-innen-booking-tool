import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  verifyPasswordSetupToken,
  consumePasswordSetupToken,
} from "@/lib/password-setup";

// Secure replacement for the old /api/auth/set-password. The doctor
// proves ownership of their inbox by presenting the single-use token
// from the emailed link (course confirmation or /start resend). Only
// then do we create/update the Supabase auth user and set the password.
//
//   GET  ?token=...            -> validate token, return first name for
//                                 the form greeting (no side effects).
//   POST { token, password }   -> consume token, set password, create the
//                                 auth user + student profile if needed.

const MIN_PASSWORD_LENGTH = 8;

function clientIp(req: NextRequest): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(`setup-token-verify:${clientIp(req)}`, [
    { windowMs: 60_000, max: 30 },
    { windowMs: 3_600_000, max: 200 },
  ]);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const admin = createAdminClient();
  const lookup = await verifyPasswordSetupToken(admin, token);
  if (!lookup) return NextResponse.json({ ok: false }, { status: 200 });
  return NextResponse.json({ ok: true, firstName: lookup.firstName });
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`setup-token-set:${clientIp(req)}`, [
    { windowMs: 60_000, max: 10 },
    { windowMs: 3_600_000, max: 60 },
  ]);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte versuche es später erneut." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: { token?: string; password?: string };
  try {
    body = (await req.json()) as { token?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = (body.token ?? "").trim();
  const password = body.password ?? "";
  if (!token) {
    return NextResponse.json({ error: "Ungültiger Link." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const lookup = await verifyPasswordSetupToken(admin, token);
  if (!lookup) {
    return NextResponse.json(
      { error: "Dieser Link ist nicht mehr gültig. Bitte fordere einen neuen an." },
      { status: 400 },
    );
  }
  const { email, firstName, auszubildendeId } = lookup;

  // The admin SDK has no getUserByEmail; scan the first page, same
  // approach as check-email. Fine for our user volume.
  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = usersPage.users.find(
    (u) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
  );

  let userId: string;
  if (existing) {
    const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (updErr) {
      return NextResponse.json(
        { error: updErr.message ?? "Passwort konnte nicht gesetzt werden." },
        { status: 500 },
      );
    }
    userId = existing.id;
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: firstName ? { first_name: firstName } : undefined,
    });
    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message ?? "Konto konnte nicht erstellt werden." },
        { status: 500 },
      );
    }
    userId = created.user.id;
  }

  // Ensure a student profile exists. Never downgrade an existing role
  // (e.g. a staff member who also bought a course).
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) {
    await admin.from("profiles").insert({ id: userId, role: "student" });
  }

  // Link the auth user to the auszubildende record (idempotent).
  await admin.from("auszubildende").update({ user_id: userId }).eq("id", auszubildendeId);

  // Single-use: clear the token now that the password is set.
  await consumePasswordSetupToken(admin, token);

  // The client signs in with (email, password) to establish the browser
  // session; it needs the email, which it does not otherwise know.
  return NextResponse.json({ ok: true, email });
}
