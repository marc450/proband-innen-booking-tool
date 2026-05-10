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
  const t = parts.title?.trim()
  const effectiveTitle = !t || NO_TITLE_VALUES.has(t.toLowerCase()) ? null : t
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
