import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireStaff() {
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
  if (!profile) return null;
  if (profile.role !== "admin" && profile.role !== "nutzer") return null;
  return user;
}

// PATCH /api/admin/proband-reviews/[id]
// Body: { is_published: boolean }
// Toggles the moderation flag. Stamps published_at on first publish.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { is_published } = (body || {}) as { is_published?: boolean };
  if (typeof is_published !== "boolean") {
    return NextResponse.json(
      { error: "is_published (boolean) required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const update: Record<string, unknown> = { is_published };
  if (is_published) {
    const { data: existing } = await admin
      .from("proband_reviews")
      .select("published_at")
      .eq("id", id)
      .maybeSingle();
    if (existing && !existing.published_at) {
      update.published_at = new Date().toISOString();
    }
  }

  const { error } = await admin
    .from("proband_reviews")
    .update(update)
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/proband-reviews/[id]
// Permanently deletes a proband review. Used for spam or duplicates.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("proband_reviews").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
