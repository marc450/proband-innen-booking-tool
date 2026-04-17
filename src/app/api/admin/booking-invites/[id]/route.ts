import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  if (!profile || profile.role !== "admin") return null;
  return user;
}

/**
 * PATCH /api/admin/booking-invites/[id]
 * Supported fields: { revoked?: boolean }
 *
 * Revoking an invite is preferred over DELETE so we keep an audit trail
 * (including which booking used it, if any).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  if (typeof body.revoked === "boolean") update.revoked = body.revoked;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen übergeben." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("booking_invites")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * DELETE /api/admin/booking-invites/[id]
 * Only allowed if the invite has not been used yet — otherwise we lose
 * the audit link from booking → invite.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("booking_invites")
    .select("id, used_count")
    .eq("id", id)
    .single();

  if (!invite) {
    return NextResponse.json({ error: "Einladung nicht gefunden." }, { status: 404 });
  }
  if (invite.used_count > 0) {
    return NextResponse.json(
      {
        error:
          "Einladung wurde bereits eingelöst und kann nicht gelöscht werden. Bitte stattdessen widerrufen.",
      },
      { status: 409 },
    );
  }

  const { error } = await admin.from("booking_invites").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
