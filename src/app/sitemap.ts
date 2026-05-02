import type { MetadataRoute } from "next";
import { getAllCourseSlugs } from "@/content/kurse";

// Canonical public host for the marketing site. Once the migration
// from www.ephia.de (LearnWorlds) to this Next.js app on the bare
// domain happens, every URL in this sitemap is the live URL.
const SITE_URL = "https://ephia.de";

// Static marketing pages, listed at their canonical clean URLs (no
// /kurse/ prefix). The Next.js middleware rewrites these to the
// internal /kurse/* file routes, but Google indexes whatever the
// sitemap + canonical headers say, which is the clean form.
//
// Course landing pages are added dynamically via getAllCourseSlugs()
// so new ones (Berlin, Anfänger:innen, etc.) show up here
// automatically as they're added to the content registry.
//
// `werde-proband-in` is intentionally NOT here — that landing lives on
// proband-innen.ephia.de (its own sitemap) and the marketing host
// 308-redirects /werde-proband-in straight there.
const STATIC_PATHS = [
  "/",
  "/unsere-kurse",
  "/curriculum-botulinum",
  "/cme-online-seminare",
  "/cme-onlinekurse-botox",
  "/kostenloser-botox-kurs",
  "/didaktik",
  "/vision",
  "/community",
  "/team",
  "/faq-kontakt",
  "/impressum",
  "/datenschutz",
  "/agb",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const courseEntries: MetadataRoute.Sitemap = getAllCourseSlugs().map(
    (slug) => ({
      url: `${SITE_URL}/${slug}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority: path === "/" ? 1.0 : 0.6,
  }));

  return [...staticEntries, ...courseEntries];
}
