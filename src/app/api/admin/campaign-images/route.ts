import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

/**
 * POST /api/admin/campaign-images
 *
 * Upload an image that the admin has pasted/attached in the campaign
 * composer. We host the image on Supabase Storage (public
 * `marketing-assets/campaigns/` folder) and return the public URL so the
 * composer can put the URL into the content block's `src` instead of a
 * base64 `data:` URL.
 *
 * Why: many email clients (Outlook, Gmail mobile in some configs, iOS
 * Mail) strip or block base64-inlined `<img>` tags as a security /
 * anti-spam measure, which caused the "screenshot does not show up for
 * some recipients" bug. A hosted URL renders everywhere.
 *
 * Admin-only: requires an authenticated Supabase user.
 * Accepts multipart/form-data with one `file` field; JPEG, PNG, GIF, WEBP.
 * Max 10 MB.
 */
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);
const BUCKET = "marketing-assets";
const FOLDER = "campaigns";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function POST(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei übergeben." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Datei ist leer." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Datei ist größer als 10 MB." }, { status: 413 });
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json({ error: `Nicht unterstützter Dateityp: ${mime}` }, { status: 415 });
  }

  // Keep the file extension so downstream clients can infer the type.
  const ext =
    mime === "image/png" ? "png" :
    mime === "image/jpeg" ? "jpg" :
    mime === "image/gif" ? "gif" :
    "webp";
  const path = `${FOLDER}/${randomUUID()}.${ext}`;

  const admin = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: mime,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    console.error("Campaign image upload failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  return NextResponse.json({ url });
}
