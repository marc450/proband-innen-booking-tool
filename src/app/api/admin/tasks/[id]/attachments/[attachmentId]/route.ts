import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "task-attachments";
const SIGNED_URL_TTL = 60; // seconds

async function assertStaff() {
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

  if (profile?.role === "admin" || profile?.role === "nutzer") return user;
  return null;
}

// GET: return a short-lived signed URL the browser can open to download
// the file. The download flag asks Storage to send a
// Content-Disposition: attachment header so browsers save instead of
// trying to render unfamiliar mime types inline.
export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; attachmentId: string }>;
  },
) {
  const user = await assertStaff();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id: taskId, attachmentId } = await params;
  const admin = createAdminClient();

  const { data: att, error } = await admin
    .from("task_attachments")
    .select("id, task_id, storage_path, file_name")
    .eq("id", attachmentId)
    .eq("task_id", taskId)
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!att)
    return NextResponse.json(
      { error: "Anhang nicht gefunden." },
      { status: 404 },
    );

  const { data: signed, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(att.storage_path, SIGNED_URL_TTL, {
      download: att.file_name,
    });
  if (signErr || !signed)
    return NextResponse.json(
      { error: signErr?.message || "Konnte URL nicht erzeugen." },
      { status: 500 },
    );

  return NextResponse.json({ url: signed.signedUrl });
}

export async function DELETE(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; attachmentId: string }>;
  },
) {
  const user = await assertStaff();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id: taskId, attachmentId } = await params;
  const admin = createAdminClient();

  const { data: att, error } = await admin
    .from("task_attachments")
    .select("id, storage_path")
    .eq("id", attachmentId)
    .eq("task_id", taskId)
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!att)
    return NextResponse.json(
      { error: "Anhang nicht gefunden." },
      { status: 404 },
    );

  const { error: storageErr } = await admin.storage
    .from(BUCKET)
    .remove([att.storage_path]);
  if (storageErr) {
    // Continue: even if storage delete fails, drop the metadata row so the
    // UI stays consistent. The orphaned bytes can be cleaned up later.
    console.warn("task attachment storage remove failed:", storageErr);
  }

  const { error: delErr } = await admin
    .from("task_attachments")
    .delete()
    .eq("id", attachmentId);
  if (delErr)
    return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
