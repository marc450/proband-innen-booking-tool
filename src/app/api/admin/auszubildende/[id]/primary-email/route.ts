import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setAuszubildendePrimary } from "@/lib/contact-emails";

// Change a contact's primary email from the dashboard. Replaces the
// direct `update({ email })` against auszubildende.email so that the
// canonical write target is the auszubildende_emails alias table; the
// 046 sync trigger keeps the legacy column in step until it's dropped.
//
// Resolves the desired email to an alias row, refusing the change if
// it already belongs to a different contact (preserves the same UX
// the previous PostgREST 23505 error produced).

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

interface RequestBody {
  email?: string;
}

export async function PUT(
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

  const trimmed = (body.email ?? "").trim().toLowerCase();
  if (!trimmed) {
    return NextResponse.json({ error: "E-Mail darf nicht leer sein." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return NextResponse.json({ error: "Ungültiges E-Mail-Format." }, { status: 400 });
  }

  const { id: contactId } = await params;
  const admin = createAdminClient();

  const { data: existingAlias } = await admin
    .from("auszubildende_emails")
    .select("id, auszubildende_id")
    .eq("email", trimmed)
    .maybeSingle();

  if (existingAlias && existingAlias.auszubildende_id !== contactId) {
    return NextResponse.json(
      { error: "Diese E-Mail ist bereits einer anderen Person zugeordnet." },
      { status: 409 },
    );
  }

  let aliasRowId: string;
  if (existingAlias) {
    aliasRowId = existingAlias.id as string;
  } else {
    const { data: inserted, error: insertError } = await admin
      .from("auszubildende_emails")
      .insert({
        auszubildende_id: contactId,
        email: trimmed,
        is_primary: false,
        source: "manual",
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      return NextResponse.json(
        { error: insertError?.message || "Insert failed." },
        { status: 500 },
      );
    }
    aliasRowId = inserted.id as string;
  }

  await setAuszubildendePrimary(contactId, aliasRowId, trimmed);
  return NextResponse.json({ ok: true, email: trimmed });
}
