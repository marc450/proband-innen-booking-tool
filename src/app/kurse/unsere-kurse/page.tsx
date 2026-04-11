import type { Metadata } from "next";
import { homeContent } from "@/content/kurse/home";
import { createAdminClient } from "@/lib/supabase/admin";
import { UnsereKurse } from "../_components/sections/home/unsere-kurse";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsere Kurse — EPHIA",
  description:
    "Alle EPHIA Kurse auf einen Blick: LÄK-zertifizierte Fortbildungen in Botulinum, Dermalfillern, Skinboostern und mehr — für approbierte Ärzt:innen.",
  alternates: { canonical: "https://www.ephia.de/unsere-kurse" },
};

export default async function UnsereKursePage() {
  // Resolve course tile images from `course_templates.image_url` so the
  // page stays in sync with whatever Marc uploads via the admin (mirrors
  // what the home page at /kurse does).
  const courseKeys = homeContent.courses.tiles
    .map((t) => t.courseKey)
    .filter((k): k is string => Boolean(k));

  const imageMap = new Map<string, string | null>();
  if (courseKeys.length > 0) {
    const supabase = createAdminClient();
    const { data: templates } = await supabase
      .from("course_templates")
      .select("course_key, image_url")
      .in("course_key", courseKeys);
    for (const t of templates ?? []) {
      imageMap.set(t.course_key as string, (t.image_url as string | null) ?? null);
    }
  }

  const mergedCourses = {
    ...homeContent.courses,
    tiles: homeContent.courses.tiles.map((tile) => {
      const fromDb = tile.courseKey ? imageMap.get(tile.courseKey) : null;
      return fromDb ? { ...tile, imagePath: fromDb } : tile;
    }),
  };

  return <UnsereKurse content={mergedCourses} tone="cream" />;
}
