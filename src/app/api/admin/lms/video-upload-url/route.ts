// TUS creation proxy for Cloudflare Stream direct creator uploads.
//
// The browser's tus-js-client sends its creation POST here (its `endpoint`).
// We forward it to Cloudflare with our API token (kept server-side) and
// hand back Cloudflare's one-time upload URL in the `Location` header. The
// client then uploads the file straight to that URL in chunks. The video
// id is the last path segment of the Location URL (/tus/<uid>).
//
// Requires (set on Railway):
//   CLOUDFLARE_ACCOUNT_ID
//   CLOUDFLARE_STREAM_API_TOKEN  (token with Stream:Edit)
// Until they exist this returns 501 and the editor falls back to manual
// video-ID entry.
//
// Admin-only. No LearnWorlds involvement.
import { NextRequest, NextResponse } from "next/server";
import { assertLmsAccess } from "@/lib/lms/admin-auth";

export async function POST(req: NextRequest) {
  if (!(await assertLmsAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !token) {
    return NextResponse.json(
      {
        error:
          "Video-Upload ist noch nicht konfiguriert. Bitte CLOUDFLARE_ACCOUNT_ID und CLOUDFLARE_STREAM_API_TOKEN in Railway setzen.",
      },
      { status: 501 },
    );
  }

  // tus-js-client's creation request carries these headers.
  const uploadLength = req.headers.get("upload-length") ?? "";
  const uploadMetadata = req.headers.get("upload-metadata") ?? "";

  const cf = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": uploadLength,
        "Upload-Metadata": uploadMetadata,
      },
    },
  );

  const location = cf.headers.get("Location");
  if (!cf.ok || !location) {
    const detail = await cf.text().catch(() => "");
    return NextResponse.json(
      { error: `Cloudflare lehnte die Upload-Anfrage ab (${cf.status}). ${detail}`.trim() },
      { status: 502 },
    );
  }

  // Echo the tus creation response back to the client. 201 + Location is
  // what tus-js-client expects; it then PATCHes the file to that URL.
  return new Response(null, {
    status: 201,
    headers: {
      "Tus-Resumable": "1.0.0",
      Location: location,
      "stream-media-id": cf.headers.get("stream-media-id") ?? "",
      "Access-Control-Expose-Headers": "Location, stream-media-id, Tus-Resumable",
    },
  });
}
