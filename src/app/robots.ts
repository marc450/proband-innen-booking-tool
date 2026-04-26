import type { MetadataRoute } from "next";
import { headers } from "next/headers";

// Hosts allowed to be indexed by search engines. Every other host
// (kurse.ephia.de staging, admin.ephia.de, proband-innen.ephia.de,
// Railway preview URLs, etc.) gets a full disallow so SEO authority
// stays concentrated on the canonical bare domain ephia.de.
const INDEXABLE_HOSTS = new Set(["ephia.de", "www.ephia.de"]);

export default async function robots(): Promise<MetadataRoute.Robots> {
  const hdrs = await headers();
  const host = (hdrs.get("host") ?? "").split(":")[0].toLowerCase();

  if (!INDEXABLE_HOSTS.has(host)) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://ephia.de/sitemap.xml",
  };
}
