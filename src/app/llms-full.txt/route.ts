import { headers } from "next/headers";
import { buildLlmsFullTxt } from "@/lib/llms";

// Same host gate as llms.txt — serve only on the canonical marketing
// host so the full-content catalogue isn't duplicated across staging,
// booking, study or admin subdomains.
const SERVE_HOSTS = new Set(["ephia.de", "www.ephia.de"]);

export async function GET(): Promise<Response> {
  const hdrs = await headers();
  const host = (hdrs.get("host") ?? "").split(":")[0].toLowerCase();

  if (!SERVE_HOSTS.has(host)) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(buildLlmsFullTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
