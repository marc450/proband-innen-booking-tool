import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Title strings that mean "no title". Imported data has shown several
// variants over time:
//   - "Kein Titel"           — the canonical TITLE_OPTIONS entry
//   - "Keine" / "Keiner"     — Heilpraktiker:innen profiles where the
//                              title field was filled with the German
//                              "no" word instead of left blank
//   - "Kein"                 — short variant
//   - "-" / "—"              — placeholder dashes
// All are normalised away so the rendered name doesn't read
// "Keine Agnes Egyed" or "- Anna Beispiel".
const NO_TITLE_VALUES = new Set([
  "kein titel",
  "kein",
  "keine",
  "keiner",
  "-",
  "—",
  "–",
]);

// Canonical academic-title dropdown options, shared by every title <select>
// (profile completion, inbox sidebar, Termin-Update modal). A bare "Dr." is
// deliberately absent: it can't be classified as human vs. dental medicine,
// which is the inconsistency migration 126 had to clean up. "Kein Titel" is
// the no-title sentinel and gets normalised to null on write.
export const TITLE_OPTIONS: string[] = [
  "Dr. med.",
  "Dr. med. dent.",
  "Prof. Dr.",
  "PD Dr.",
  "Kein Titel",
];

/**
 * Normalise a title value for STORAGE. Returns null for empty input or any
 * "no title" sentinel (see NO_TITLE_VALUES), otherwise the trimmed title.
 * Call this at every DB write so placeholders like "Kein Titel" never land
 * in the title column; formatPersonName() is only the read-side safety net.
 */
export function normalizeTitle(title?: string | null): string | null {
  const t = title?.trim()
  if (!t || NO_TITLE_VALUES.has(t.toLowerCase())) return null
  return t
}

/**
 * Format a person's display name from title + first + last. Drops any
 * "no title" sentinel value so it doesn't leak into the composed name
 * (see NO_TITLE_VALUES above).
 *
 * Returns undefined when every part is empty so callers can fall back to an
 * email or "Unbekannt" themselves.
 */
export function formatPersonName(parts: {
  title?: string | null
  firstName?: string | null
  lastName?: string | null
}): string | undefined {
  const effectiveTitle = normalizeTitle(parts.title)
  const joined = [effectiveTitle, parts.firstName?.trim(), parts.lastName?.trim()]
    .filter((x): x is string => !!x)
    .join(" ")
  return joined || undefined
}

/**
 * Format an embedded `instructor` profile (the one PostgREST returns
 * via `instructor:profiles!instructor_id(...)`) as a single name string.
 * Returns null when the relation is null so callers can branch on it.
 */
export function formatInstructor(
  instructor: { title: string | null; first_name: string | null; last_name: string | null } | null | undefined,
): string | null {
  if (!instructor) return null
  return formatPersonName({
    title: instructor.title,
    firstName: instructor.first_name,
    lastName: instructor.last_name,
  }) ?? null
}
