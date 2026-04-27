import type { MetadataRoute } from "next";
import { getAllCourseSlugs } from "@/content/kurse";

// Canonical public host for the marketing site. Once the migration
// from www.ephia.de (LearnWorlds) to this Next.js app on the bare
// domain happens, every URL in this sitemap is the live URL.
const SITE_URL = "https://ephia.de";

// Static marketing pages under /kurse/* that aren't generated from the
// course registry. Course landing pages are added dynamically via
// getAllCourseSlugs() so new ones (Berlin, Anfänger:innen, etc.) show
// up here automatically as they're added to the registry.
const STATIC_KURSE_PATHS = [
  "/kurse",
  "/kurse/unsere-kurse",
  "/kurse/curriculum-botulinum",
  "/kurse/cme-online-seminare",
  "/kurse/cme-onlinekurse-botox",
  "/kurse/kostenloser-botox-kurs",
  "/kurse/didaktik",
  "/kurse/vision",
  "/kurse/community",
  "/kurse/team",
  "/kurse/faq-kontakt",
  "/kurse/werde-proband-in",
  "/kurse/impressum",
  "/kurse/datenschutz",
  "/kurse/agb",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const courseEntries: MetadataRoute.Sitemap = getAllCourseSlugs().map(
    (slug) => ({
      url: `${SITE_URL}/kurse/${slug}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  const staticEntries: MetadataRoute.Sitemap = STATIC_KURSE_PATHS.map(
    (path) => ({
      url: `${SITE_URL}${path}`,
      lastModified,
      changeFrequency: "monthly",
      priority: path === "/kurse" ? 1.0 : 0.6,
    }),
  );

  return [...staticEntries, ...courseEntries];
}
