/**
 * Hardcoded curriculum definitions.
 * Each curriculum references existing course_templates by course_key.
 * Pricing, names, and sessions are always fetched live from templates.
 */

export interface CurriculumCourse {
  courseKey: string;
  sort: number;
}

export interface CurriculumConfig {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  courseType: "Kombikurs";
  discountPercent: number;
  courses: CurriculumCourse[];
}

export const CURRICULUM_BOTULINUM: CurriculumConfig = {
  slug: "botulinum",
  title: "Curriculum Botulinum",
  subtitle: "Dein Weg zur Spezialisierung in der Botulinumtoxin-Therapie",
  description:
    "Vier aufeinander aufbauende Kurse, die Dich vom Grundlagenwissen bis zur Masterclass begleiten. Buche das Komplettpaket und spare 10%.",
  courseType: "Kombikurs",
  discountPercent: 10,
  courses: [
    { courseKey: "grundkurs_botulinum", sort: 1 },
    { courseKey: "grundkurs_medizinische_hautpflege", sort: 2 },
    { courseKey: "aufbaukurs_therapeutische_indikationen_botulinum", sort: 3 },
    { courseKey: "masterclass_botulinum", sort: 4 },
  ],
} as const;

/** Map of all curricula by slug */
export const CURRICULA: Record<string, CurriculumConfig> = {
  botulinum: CURRICULUM_BOTULINUM,
};

/** Lookup: courseKey → curriculum slug (for banner on individual course pages) */
export function getCurriculumForCourseKey(
  courseKey: string
): CurriculumConfig | null {
  for (const curriculum of Object.values(CURRICULA)) {
    if (curriculum.courses.some((c) => c.courseKey === courseKey)) {
      return curriculum;
    }
  }
  return null;
}
