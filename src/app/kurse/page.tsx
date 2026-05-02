import type { Metadata } from "next";
import { homeContent } from "@/content/kurse/home";
import { createAdminClient } from "@/lib/supabase/admin";

import { HomeHero } from "./_components/sections/home/hero";
import { WerWirSind } from "./_components/sections/home/wer-wir-sind";
import { UnsereKurse } from "./_components/sections/home/unsere-kurse";
import { InstagramFeed } from "./_components/sections/home/instagram-feed";
import { Testimonials } from "./_components/sections/testimonials";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: homeContent.meta.title,
  description: homeContent.meta.description,
  openGraph: {
    title: homeContent.meta.title,
    description: homeContent.meta.description,
    type: "website",
    siteName: "EPHIA",
    locale: "de_DE",
    ...(homeContent.meta.ogImage ? { images: [homeContent.meta.ogImage] } : {}),
  },
  twitter: {
    card: "summary_large_image",
    title: homeContent.meta.title,
    description: homeContent.meta.description,
    ...(homeContent.meta.ogImage ? { images: [homeContent.meta.ogImage] } : {}),
  },
  alternates: {
    canonical: "https://ephia.de/",
  },
};

export default async function HomePage() {
  // Resolve course tile images + titles from `course_templates` so the
  // home page stays in sync with whatever Marc edits via the admin.
  const courseKeys = homeContent.courses.tiles
    .map((t) => t.courseKey)
    .filter((k): k is string => Boolean(k));

  const templateMap = new Map<
    string,
    {
      image_url: string | null;
      title: string | null;
      audience: string | null;
      level: string | null;
      card_description: string | null;
    }
  >();
  if (courseKeys.length > 0) {
    const supabase = createAdminClient();
    const { data: templates } = await supabase
      .from("course_templates")
      .select("course_key, image_url, title, audience, level, card_description")
      .in("course_key", courseKeys);
    for (const t of templates ?? []) {
      templateMap.set(t.course_key as string, {
        image_url: (t.image_url as string | null) ?? null,
        title: (t.title as string | null) ?? null,
        audience: (t.audience as string | null) ?? null,
        level: (t.level as string | null) ?? null,
        card_description: (t.card_description as string | null) ?? null,
      });
    }
  }

  const mergedCourses = {
    ...homeContent.courses,
    tiles: homeContent.courses.tiles.map((tile) => {
      const fromDb = tile.courseKey ? templateMap.get(tile.courseKey) : null;
      if (!fromDb) return tile;
      return {
        ...tile,
        ...(fromDb.image_url ? { imagePath: fromDb.image_url } : {}),
        ...(fromDb.title ? { dbTitle: fromDb.title } : {}),
        ...(fromDb.audience ? { dbAudience: fromDb.audience } : {}),
        ...(fromDb.level ? { dbLevel: fromDb.level } : {}),
        ...(fromDb.card_description ? { dbCardDescription: fromDb.card_description } : {}),
      };
    }),
  };

  return (
    <>
      <HomeHero content={homeContent.hero} />
      <WerWirSind content={homeContent.werWirSind} />
      <UnsereKurse content={mergedCourses} />
      <Testimonials content={homeContent.testimonials} />
      <InstagramFeed content={homeContent.instagram} />
    </>
  );
}
