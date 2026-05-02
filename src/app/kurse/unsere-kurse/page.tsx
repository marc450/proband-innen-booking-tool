import type { Metadata } from "next";
import { homeContent } from "@/content/kurse/home";
import { createAdminClient } from "@/lib/supabase/admin";
import { UnsereKurse } from "../_components/sections/home/unsere-kurse";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsere Kurse | EPHIA",
  description:
    "Alle EPHIA Kurse auf einen Blick: LÄK-zertifizierte Fortbildungen in Botulinum, Dermalfillern, Skinboostern und mehr für approbierte Ärzt:innen.",
  alternates: { canonical: "https://ephia.de/unsere-kurse" },
};

export default async function UnsereKursePage() {
  // Resolve course tile images + titles from `course_templates` so this
  // page stays in sync with whatever Marc edits via the admin (mirrors
  // the home page at /kurse).
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

  return <UnsereKurse content={mergedCourses} tone="cream" />;
}
