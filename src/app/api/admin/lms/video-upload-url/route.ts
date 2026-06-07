// Creates a one-time Cloudflare Stream direct-upload URL so the browser
// can upload a lesson video straight to Cloudflare (the file never passes
// through our server). Returns the upload URL + the video uid, which the
// editor stores as the block's cfStreamVideoId.
//
// Requires two server env vars (set on Railway):
//   CLOUDFLARE_ACCOUNT_ID
//   CLOUDFLARE_STREAM_API_TOKEN  (token with Stream:Edit)
// Until they exist the route returns a clear "not configured" error and
// the editor falls back to manual video-ID entry.
//
// Admin-only. No LearnWorlds involvement.
import { NextResponse } from "next/server";
import { assertLmsAdmin } from "@/lib/lms/admin-auth";

// Cloudflare's single-request direct upload accepts videos up to ~200 MB
// and the given max duration. Larger files would need the TUS flow.
const MAX_DURATION_SECONDS = 7200;

export async function POST() {
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

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ maxDurationSeconds: MAX_DURATION_SECONDS, requireSignedURLs: false }),
    },
  );

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success || !json?.result?.uploadURL) {
    const msg = json?.errors?.[0]?.message || "Cloudflare lehnte die Upload-Anfrage ab.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ uploadURL: json.result.uploadURL, uid: json.result.uid });
}
