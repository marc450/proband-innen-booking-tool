import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setAuszubildendePrimary, setPatientPrimary } from "@/lib/contact-emails";

// Per-row email operations.
//   PATCH /api/inbox/emails/<id>  body: { source, action: "setPrimary" }
//   DELETE /api/inbox/emails/<id>?source=auszubildende|patient
//
// Deleting the only primary is rejected unless the caller explicitly
// promotes another email first — keeps the "exactly one primary per
// contact" invariant intact.

type EmailSource = "auszubildende" | "patient";

async function assertStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await assertStaff();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const source = body.source as EmailSource | undefined;
  const action = body.action as string | undefined;

  if (!source || action !== "setPrimary") {
    return NextResponse.json({ error: "source and action required" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (source === "auszubildende") {
    const { data: row } = await admin
      .from("auszubildende_emails")
      .select("auszubildende_id, email")
      .eq("id", id)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: "Email not found" }, { status: 404 });

    await setAuszubildendePrimary(row.auszubildende_id, id, row.email);
    return NextResponse.json({ ok: true });
  }

  if (source === "patient") {
    const { data: row } = await admin
      .from("patient_email_hashes")
      .select("patient_id, email_hash")
      .eq("id", id)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: "Email not found" }, { status: 404 });

    await setPatientPrimary(row.patient_id, id, row.email_hash);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid source" }, { status: 400 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await assertStaff();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const source = req.nextUrl.searchParams.get("source") as EmailSource | null;
  if (!source) {
    return NextResponse.json({ error: "source required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const table =
    source === "auszubildende" ? "auszubildende_emails" : "patient_email_hashes";

  const { data: row } = await admin
    .from(table)
    .select("is_primary")
    .eq("id", id)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }
  if (row.is_primary) {
    return NextResponse.json(
      {
        error:
          "Primäre E-Mail kann nicht gelöscht werden. Markiere zuerst eine andere E-Mail als primär.",
      },
      { status: 400 },
    );
  }

  const { error } = await admin.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
