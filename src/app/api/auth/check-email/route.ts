import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// First step of the lazy-migration login flow on ephia.de/start.
// The user types their email; this route reports whether they
//   (a) already have a Supabase Auth account with a password
//       → show password input,
//   (b) are a known customer (in auszubildende, by primary email or
//       any alias) but don't yet have a Supabase Auth account
//       → show "set password" form,
//   (c) are unknown to us at all
//       → show "we don't have an account for this email" message.
//
// No emails are sent at any point. The next step (set-password) uses
// admin.createUser with email_confirm:true so Supabase doesn't fire
// its automatic confirmation email either.

interface RequestBody {
  email?: string;
}

interface CheckResponse {
  status: "has_password" | "needs_password" | "not_a_customer";
  // When known, the contact's first name so the next-step UI can
  // greet them by name. Returned for has_password and needs_password,
  // null otherwise.
  first_name: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "email must be a valid address" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // ── Look up auszubildende by email (primary OR alias). Same
  //    pattern the import endpoints use; ensures a customer who has
  //    an alias on file isn't mistaken for "not a customer".
  let auszubildende: { id: string; first_name: string | null } | null = null;

  const { data: aliasHit } = await admin
    .from("auszubildende_emails")
    .select("auszubildende_id")
    .eq("email", email)
    .maybeSingle();
  if (aliasHit) {
    const { data } = await admin
      .from("auszubildende")
      .select("id, first_name")
      .eq("id", aliasHit.auszubildende_id)
      .maybeSingle();
    if (data) auszubildende = { id: data.id, first_name: data.first_name };
  }
  if (!auszubildende) {
    const { data } = await admin
      .from("auszubildende")
      .select("id, first_name")
      .ilike("email", email)
      .maybeSingle();
    if (data) auszubildende = { id: data.id, first_name: data.first_name };
  }

  // ── Look up an existing Supabase Auth user by email. The admin SDK
  //    doesn't expose a direct getUserByEmail, so we pull the page
  //    that holds it. For our user volume (low thousands max in the
  //    foreseeable future) listUsers is acceptable; if we ever need
  //    O(1) lookup we'll swap in an RPC that queries auth.users
  //    directly via security-definer.
  const { data: usersPage } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const authUser = usersPage.users.find(
    (u) => (u.email ?? "").toLowerCase() === email,
  );

  // Decide which of the three branches the caller belongs to.
  // - auth user exists → they've previously gone through the
  //   set-password flow on our side, so we always treat them as
  //   has_password. (Once Stripe checkout starts creating Supabase
  //   users without passwords we'll need an app_metadata flag here;
  //   today nothing creates a passwordless auth user, so the
  //   simplification is safe.)
  if (authUser) {
    return NextResponse.json<CheckResponse>({
      status: "has_password",
      first_name: auszubildende?.first_name ?? null,
    });
  }

  if (auszubildende) {
    return NextResponse.json<CheckResponse>({
      status: "needs_password",
      first_name: auszubildende.first_name,
    });
  }

  return NextResponse.json<CheckResponse>({
    status: "not_a_customer",
    first_name: null,
  });
}
