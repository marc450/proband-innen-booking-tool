import type { MetadataRoute } from "next";
import { headers } from "next/headers";

// Dynamic robots.txt so kurse.ephia.de (shadow marketing staging) is
// disallowed for all crawlers while the other hosts behave normally.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const hdrs = await headers();
  const host = (hdrs.get("host") ?? "").split(":")[0];

  if (host === "kurse.ephia.de") {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [{ userAgent: "*", allow: "/" }],
  };
}
