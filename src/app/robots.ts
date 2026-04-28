import type { MetadataRoute } from "next";
import { headers } from "next/headers";

// Hosts allowed to be indexed by search engines. Every other host
// (kurse.ephia.de staging, admin.ephia.de, Railway preview URLs, etc.)
// gets a full disallow so SEO authority stays concentrated on the
// indexable hosts.
const INDEXABLE_HOSTS = new Set([
  "ephia.de",
  "www.ephia.de",
  // Recruitment funnel for Proband:innen — the marketing landing at
  // werde-proband-in should rank, the booking funnel itself is fine
  // for Google to crawl, but the doctor-referred /book/privat funnel
  // is excluded below.
  "proband-innen.ephia.de",
]);

export default async function robots(): Promise<MetadataRoute.Robots> {
  const hdrs = await headers();
  const host = (hdrs.get("host") ?? "").split(":")[0].toLowerCase();

  if (!INDEXABLE_HOSTS.has(host)) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  // proband-innen.ephia.de: allow everything EXCEPT the private
  // booking funnel, which is only ever meant to be reached via
  // doctor-emailed links. Belt-and-braces with the noindex meta tag
  // and X-Robots-Tag header on /book/privat.
  if (host === "proband-innen.ephia.de") {
    return {
      rules: [{ userAgent: "*", allow: "/", disallow: "/book/privat" }],
    };
  }

  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://ephia.de/sitemap.xml",
  };
}
