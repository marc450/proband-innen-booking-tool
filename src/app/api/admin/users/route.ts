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
  const {
    data: { users: authUsers },
    error,
  } = await adminClient.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, title, first_name, last_name, role, is_dozent, is_kursbetreuung");

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  const result = authUsers.map((u) => ({
    id: u.id,
    email: u.email || "",
    title: profileMap.get(u.id)?.title ?? null,
    first_name: profileMap.get(u.id)?.first_name ?? null,
    last_name: profileMap.get(u.id)?.last_name ?? null,
    role: (profileMap.get(u.id)?.role ?? "nutzer") as "admin" | "nutzer",
    is_dozent: profileMap.get(u.id)?.is_dozent ?? false,
    is_kursbetreuung: profileMap.get(u.id)?.is_kursbetreuung ?? false,
    created_at: u.created_at,
  }));

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
