import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a person's display name from title + first + last. The TITLE_OPTIONS
 * list across the app uses the literal string "Kein Titel" as the "no title"
 * choice, which is truthy and would leak into naive `[title, first, last]
 * .filter(Boolean).join(" ")` compositions as "Kein Titel Theresa Hristov".
 * This helper drops it.
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
  const effectiveTitle = !t || t.toLowerCase() === "kein titel" ? null : t
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
