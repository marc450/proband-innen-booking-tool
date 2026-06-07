// LMS lesson image upload. Admin-only. Stores the file in the public
// `lms-images` Supabase Storage bucket (same bucket the seeded figures
// use) via the service-role client and returns its public URL, which is
// then written into a figure block's `src`.
//
// Touches only storage + lms editing; no LearnWorlds involvement.
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertLmsAdmin } from "@/lib/lms/admin-auth";

const BUCKET = "lms-images";
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export async function POST(req: NextRequest) {
  if (!(await assertLmsAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei übermittelt." }, { status: 400 });
  }

  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Nicht unterstütztes Format. Erlaubt: PNG, JPG, WEBP, GIF, AVIF." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Datei zu groß (max. 15 MB)." }, { status: 400 });
  }

  const path = `uploads/${randomUUID()}.${ext}`;
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  return NextResponse.json({ url });
}
