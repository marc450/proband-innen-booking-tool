import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Second step of the lazy-migration flow. Called after check-email
// returns "needs_password" and the user submits a password.
//
// Verifies the email is in our auszubildende table (so a stranger
// can't create an account just by submitting any email), then
// creates the Supabase Auth user with the chosen password using
// admin.createUser({ email_confirm: true }) — which suppresses
// Supabase's automatic confirmation/magic-link email entirely.
//
// On success:
//   - auth.users row exists with the password set
//   - profiles row created with role='student' (so the admin domain
//     gate at src/lib/supabase/middleware.ts blocks them from
//     /dashboard even with a valid session)
//   - auszubildende.user_id linked to the new auth user
//
// Frontend then calls supabase.auth.signInWithPassword to establish
// the session client-side.

interface RequestBody {
  email?: string;
  password?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Same minimum Supabase Auth's signup endpoint enforces by default.
const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Bitte gib eine gültige E-Mail-Adresse ein." },
      { status: 400 },
    );
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // ── Verify the email is a known customer. Same alias-aware lookup
  //    as check-email — the customer might have set their alias as
  //    primary email after they bought the course.
  let auszubildendeId: string | null = null;

  const { data: aliasHit } = await admin
    .from("auszubildende_emails")
    .select("auszubildende_id")
    .eq("email", email)
    .maybeSingle();
  if (aliasHit) auszubildendeId = aliasHit.auszubildende_id;

  if (!auszubildendeId) {
    const { data: legacy } = await admin
      .from("auszubildende")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (legacy) auszubildendeId = legacy.id;
  }

  if (!auszubildendeId) {
    return NextResponse.json(
      {
        error:
          "Wir haben kein Konto für diese E-Mail. Hast Du einen Kurs bei uns gebucht?",
      },
      { status: 404 },
    );
  }

  // ── Defensive double-check: refuse to create an auth user if one
  //    with this email already exists. The frontend should never call
  //    set-password on a has_password account, but a stale check-email
  //    result + a refresh could race. Returning 409 lets the UI tell
  //    the user to use the normal sign-in flow instead.
  const { data: usersPage } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existing = usersPage.users.find(
    (u) => (u.email ?? "").toLowerCase() === email,
  );
  if (existing) {
    return NextResponse.json(
      {
        error:
          "Für diese E-Mail existiert bereits ein Konto. Bitte logge Dich mit Deinem Passwort ein.",
      },
      { status: 409 },
    );
  }

  // ── Create the Supabase Auth user with the chosen password.
  //    email_confirm:true marks the email as already verified AND
  //    suppresses Supabase's automatic confirmation email.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message ?? "Konto konnte nicht erstellt werden." },
      { status: 500 },
    );
  }

  // ── Profile + auszubildende link. role='student' is what gates
  //    the admin host: the middleware blocks any non-staff role from
  //    /dashboard or /m, so even a student session can't reach the
  //    admin surface by URL-hacking.
  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    role: "student",
  });
  if (profileErr) {
    // Best-effort cleanup so we don't leave an orphan auth user that
    // would block re-running this flow.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: `Profile konnte nicht angelegt werden: ${profileErr.message}` },
      { status: 500 },
    );
  }

  await admin
    .from("auszubildende")
    .update({ user_id: created.user.id })
    .eq("id", auszubildendeId);

  return NextResponse.json({ ok: true });
}
