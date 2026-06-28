import { headers } from "next/headers";
import { buildLlmsTxt } from "@/lib/llms";

// Hosts on which llms.txt is served. Keeps the file (and the AI-guide
// authority it carries) concentrated on the canonical marketing host,
// mirroring the indexable-host gate in robots.ts. www is 301'd to the
// bare domain in middleware before it reaches here.
const SERVE_HOSTS = new Set(["ephia.de", "www.ephia.de"]);

export async function GET(): Promise<Response> {
  const hdrs = await headers();
  const host = (hdrs.get("host") ?? "").split(":")[0].toLowerCase();

  if (!SERVE_HOSTS.has(host)) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
