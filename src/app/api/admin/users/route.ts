import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

export async function GET() {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const adminClient = createAdminClient();

  // Only staff (admin / nutzer) belong in this table. Customer accounts
  // created via the LW SSO bridge get role='student' and must be excluded.
  const { data: profiles, error: profilesErr } = await adminClient
    .from("profiles")
    .select("id, title, first_name, last_name, role, is_dozent, is_kursbetreuung, is_autor, slack_user_id, dozent_employer, dozent_specialization")
    .in("role", ["admin", "nutzer"]);
  if (profilesErr) return NextResponse.json({ error: profilesErr.message }, { status: 500 });

  // Fetch each staff auth row by id. listUsers() is paginated (50/page
  // default, 1000 max), so after the LW SSO migration added many
  // 'student' auth rows the staff ids no longer fit on the first page.
  const authRecords = await Promise.all(
    (profiles ?? []).map((p) => adminClient.auth.admin.getUserById(p.id))
  );
  const authMap = new Map(
    authRecords
      .map((r) => r.data?.user)
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((u) => [u.id, u])
  );

  const result = (profiles || [])
    .map((p) => {
      const auth = authMap.get(p.id);
      if (!auth) return null;
      return {
        id: p.id,
        email: auth.email || "",
        title: p.title ?? null,
        first_name: p.first_name ?? null,
        last_name: p.last_name ?? null,
        role: p.role as "admin" | "nutzer",
        is_dozent: p.is_dozent ?? false,
        is_kursbetreuung: p.is_kursbetreuung ?? false,
        is_autor: p.is_autor ?? false,
        slack_user_id: p.slack_user_id ?? null,
        dozent_employer: p.dozent_employer ?? null,
        dozent_specialization: p.dozent_specialization ?? null,
        created_at: auth.created_at,
      };
    })
    .filter((u): u is NonNullable<typeof u> => u !== null);

  return NextResponse.json(result);
}

// Find an auth user by email. supabase-js admin has no getUserByEmail,
// so we page through listUsers. Only called on the rare conflict path,
// so the extra requests are acceptable. perPage 1000 = the max.
async function findAuthUserByEmail(
  adminClient: ReturnType<typeof createAdminClient>,
  email: string,
) {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) return null;
    const match = data.users.find((u) => (u.email || "").toLowerCase() === target);
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { title, first_name, last_name, email, role, is_dozent, is_kursbetreuung, is_autor, slack_user_id, dozent_employer, dozent_specialization, password, promote } = await req.json();
  if (!email || !first_name || !last_name || !password) {
    return NextResponse.json({ error: "Bitte alle Pflichtfelder ausfüllen." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const isDozentFinal = is_dozent ?? false;
  const profileFields = {
    title: title || null,
    first_name,
    last_name,
    role: role === "admin" ? "admin" : "nutzer",
    is_dozent: isDozentFinal,
    is_kursbetreuung: is_kursbetreuung ?? false,
    is_autor: is_autor ?? false,
    slack_user_id: typeof slack_user_id === "string" && slack_user_id.trim() ? slack_user_id.trim() : null,
    dozent_employer: isDozentFinal ? (dozent_employer?.trim() || null) : null,
    dozent_specialization: isDozentFinal ? (dozent_specialization?.trim() || null) : null,
  };

  // Promote path: the admin confirmed they want to upgrade an existing
  // account (e.g. a 'student' customer from the LW SSO bridge) to staff.
  // We reuse the same auth row, set the new staff password, and upsert
  // the profile. Their existing login password is replaced.
  if (promote) {
    const existing = await findAuthUserByEmail(adminClient, email);
    if (!existing) {
      return NextResponse.json({ error: "Bestehendes Konto nicht gefunden." }, { status: 404 });
    }
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    });
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    const { error: profileErr } = await adminClient
      .from("profiles")
      .upsert({ id: existing.id, ...profileFields });
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, userId: existing.id, promoted: true });
  }

  // createUser with email_confirm: true — no email is sent
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name, last_name },
  });

  if (error) {
    // Email already taken: surface the existing account so the UI can
    // offer to promote it instead of dead-ending on a generic error.
    const existing = await findAuthUserByEmail(adminClient, email);
    if (existing) {
      const { data: prof } = await adminClient
        .from("profiles")
        .select("role, first_name, last_name")
        .eq("id", existing.id)
        .maybeSingle();
      return NextResponse.json(
        {
          conflict: true,
          existing: {
            email: existing.email,
            role: prof?.role ?? null,
            first_name: prof?.first_name ?? null,
            last_name: prof?.last_name ?? null,
          },
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await adminClient.from("profiles").insert({ id: data.user.id, ...profileFields });

  return NextResponse.json({ ok: true, userId: data.user.id });
}
