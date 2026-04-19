import type { CourseLandingContent } from "./types";
import { grundkursBotulinum } from "./grundkurs-botulinum";
import { grundkursBotulinumZahnmedizin } from "./grundkurs-botulinum-zahnmedizin";
import { grundkursDermalfiller } from "./grundkurs-dermalfiller";
import { aufbaukursLippen } from "./aufbaukurs-lippen";
import { grundkursMedizinischeHautpflege } from "./grundkurs-medizinische-hautpflege";
import { aufbaukursTherapeutischeIndikationenBotulinum } from "./aufbaukurs-therapeutische-indikationen-botulinum";
import { aufbaukursBotulinumPerioraleZone } from "./aufbaukurs-botulinum-periorale-zone";
import { aufbaukursBiostimulationSkinbooster } from "./aufbaukurs-biostimulation-skinbooster";

/**
 * Registry of all course landing page content, keyed by URL slug.
 *
 * To add a new course:
 *   1. Create `src/content/kurse/<slug>.ts` exporting a `CourseLandingContent` object.
 *   2. Import it here and add it to the registry below.
 *   3. Make sure the `courseKey` in the content matches a row in Supabase
 *      `course_templates.course_key` so the booking widget fetches sessions.
 */
const registry: Record<string, CourseLandingContent> = {
  [grundkursBotulinum.slug]: grundkursBotulinum,
  [grundkursBotulinumZahnmedizin.slug]: grundkursBotulinumZahnmedizin,
  [grundkursDermalfiller.slug]: grundkursDermalfiller,
  [aufbaukursLippen.slug]: aufbaukursLippen,
  [grundkursMedizinischeHautpflege.slug]: grundkursMedizinischeHautpflege,
  [aufbaukursTherapeutischeIndikationenBotulinum.slug]: aufbaukursTherapeutischeIndikationenBotulinum,
  [aufbaukursBotulinumPerioraleZone.slug]: aufbaukursBotulinumPerioraleZone,
  [aufbaukursBiostimulationSkinbooster.slug]: aufbaukursBiostimulationSkinbooster,
};

export function getCourseContent(slug: string): CourseLandingContent | null {
  return registry[slug] ?? null;
}

export function getAllCourseSlugs(): string[] {
  return Object.keys(registry);
}

export type { CourseLandingContent } from "./types";
