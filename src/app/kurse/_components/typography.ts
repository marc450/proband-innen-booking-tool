/**
 * Shared typography standards for the /kurse marketing surface.
 *
 * These tokens are derived from the grundkurs-botulinum course page
 * (src/app/kurse/_components/sections/*) and exist so every page
 * across /kurse uses the exact same type scale for unity.
 *
 * Use them as Tailwind class strings:
 *
 *   <h2 className={TYPO.h2}>…</h2>
 *   <p className={TYPO.bodyCard}>…</p>
 */
export const TYPO = {
  /** Hero H1 — only used on homepage / landing heroes. */
  h1: "text-5xl lg:text-6xl font-bold tracking-tight leading-[1.2]",

  /** Section heading (e.g. "Unsere Kurse", "Lernziele", "FAQ"). */
  h2: "text-3xl md:text-4xl font-bold tracking-wide",

  /** Large subsection heading (e.g. Lernplattform feature titles, card titles). */
  h3: "text-2xl md:text-3xl font-bold tracking-wide leading-tight",

  /** Small heading inside compact cards (e.g. Lernziele grid items). */
  h4: "text-lg font-bold",

  /** Lead / intro paragraph directly under an H2. Bigger body size. */
  bodyLead: "text-base md:text-lg text-black/70 leading-relaxed",

  /** Standard body copy used inside cards and accordions. */
  bodyCard: "text-sm md:text-base text-black/75 leading-relaxed",

  /** Small supporting text (variant labels, meta info). */
  bodySmall: "text-sm md:text-base text-black/60 font-medium",
} as const;

/** Capitalise the first letter of each word — "GRUNDKURS" → "Grundkurs". */
export function titleCase(value: string): string {
  return value.replace(/\w\S*/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
}
