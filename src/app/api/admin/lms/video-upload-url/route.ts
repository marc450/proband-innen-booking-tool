// Creates a one-time Cloudflare Stream **resumable (TUS)** upload URL so
// the browser can upload a lesson video of any size directly to
// Cloudflare in chunks (the file never passes through our server, and no
// API token is exposed to the browser).
//
// Flow: we POST to .../stream?direct_user=true with the file's byte
// length; Cloudflare returns the one-time upload URL in the `Location`
// header and the video id in the `stream-media-id` header. The browser
// then uploads to that URL with tus-js-client.
//
// Requires two server env vars (set on Railway):
//   CLOUDFLARE_ACCOUNT_ID
//   CLOUDFLARE_STREAM_API_TOKEN  (token with Stream:Edit)
// Until they exist the route returns a clear "not configured" error and
// the editor falls back to manual video-ID entry.
//
// Admin-only. No LearnWorlds involvement.
import { NextRequest, NextResponse } from "next/server";
import { assertLmsAdmin } from "@/lib/lms/admin-auth";

const MAX_DURATION_SECONDS = 7200;

function b64(s: string) {
  return Buffer.from(s, "utf8").toString("base64");
}

export async function POST(req: NextRequest) {
  if (!(await assertLmsAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !token) {
    return NextResponse.json(
      {
        error:
          "Video-Upload ist noch nicht konfiguriert. Bitte CLOUDFLARE_ACCOUNT_ID und CLOUDFLARE_STREAM_API_TOKEN in Railway setzen. Bis dahin kannst Du die Cloudflare-Video-ID manuell eingeben.",
      },
      { status: 501 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const size = Number(body.size);
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "Dateigröße fehlt." }, { status: 400 });
  }

  // Upload-Metadata is a comma-separated list of `key base64(value)` pairs.
  const meta: string[] = [`maxDurationSeconds ${b64(String(MAX_DURATION_SECONDS))}`];
  if (typeof body.name === "string" && body.name.trim()) {
    meta.push(`name ${b64(body.name.trim())}`);
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": String(size),
        "Upload-Metadata": meta.join(","),
      },
    },
  );

  // TUS creation responds 201 with the upload URL + media id in headers.
  const uploadURL = res.headers.get("Location");
  const uid = res.headers.get("stream-media-id");
  if (!res.ok || !uploadURL || !uid) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Cloudflare lehnte die Upload-Anfrage ab (${res.status}). ${text}`.trim() },
      { status: 502 },
    );
  }

  return NextResponse.json({ uploadURL, uid });
}
