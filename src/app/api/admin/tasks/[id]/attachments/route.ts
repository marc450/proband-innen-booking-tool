import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "task-attachments";
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await assertStaff();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id: taskId } = await params;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Keine Datei übergeben." },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Datei ist leer." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Datei ist größer als 25 MB." },
      { status: 413 },
    );
  }

  const admin = createAdminClient();

  // Make sure the task exists (avoid orphaned uploads).
  const { data: task, error: taskErr } = await admin
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .maybeSingle();
  if (taskErr)
    return NextResponse.json({ error: taskErr.message }, { status: 500 });
  if (!task)
    return NextResponse.json({ error: "Aufgabe nicht gefunden." }, {
      status: 404,
    });

  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 200) ||
    "datei";
  const storagePath = `${taskId}/${randomUUID()}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: row, error: insertErr } = await admin
    .from("task_attachments")
    .insert({
      task_id: taskId,
      uploaded_by: user.id,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      storage_path: storagePath,
    })
    .select(
      "id, task_id, uploaded_by, file_name, file_size, mime_type, storage_path, created_at, uploader:profiles!task_attachments_uploaded_by_fkey(id, title, first_name, last_name)",
    )
    .single();

  if (insertErr || !row) {
    // Best-effort cleanup of the orphaned object.
    await admin.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: insertErr?.message || "Konnte Anhang nicht speichern." },
      { status: 500 },
    );
  }

  return NextResponse.json({ attachment: row });
}
