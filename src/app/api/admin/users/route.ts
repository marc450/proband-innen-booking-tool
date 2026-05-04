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
    .select("id, title, first_name, last_name, role, is_dozent, is_kursbetreuung")
    .in("role", ["admin", "nutzer"]);
  if (profilesErr) return NextResponse.json({ error: profilesErr.message }, { status: 500 });

  const {
    data: { users: authUsers },
    error,
  } = await adminClient.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const authMap = new Map(authUsers.map((u) => [u.id, u]));

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
        created_at: auth.created_at,
      };
    })
    .filter((u): u is NonNullable<typeof u> => u !== null);

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { title, first_name, last_name, email, role, is_dozent, is_kursbetreuung, password } = await req.json();
  if (!email || !first_name || !last_name || !password) {
    return NextResponse.json({ error: "Bitte alle Pflichtfelder ausfüllen." }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // createUser with email_confirm: true — no email is sent
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name, last_name },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await adminClient.from("profiles").insert({
    id: data.user.id,
    title: title || null,
    first_name,
    last_name,
    role: role === "admin" ? "admin" : "nutzer",
    is_dozent: is_dozent ?? false,
    is_kursbetreuung: is_kursbetreuung ?? false,
  });

  return NextResponse.json({ ok: true, userId: data.user.id });
}
