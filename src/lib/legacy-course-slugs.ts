// Legacy LearnWorlds course slugs imported into legacy_bookings have
// historical names that don't match what the same course is called
// today. We can't rename the LW slugs themselves (they're external
// identifiers), so we map them to their current display titles when
// surfacing legacy bookings anywhere in the admin UI.
//
// Add a new entry whenever you spot a stale name — keys are the raw
// slug as stored in legacy_bookings.product_name (lowercase, dashed),
// values are the current human-readable course title.

const LEGACY_SLUG_OVERRIDES: Record<string, string> = {
  // Old LW name "Medizinische Indikation für Botulinum" was rebranded
  // to "Therapeutische Indikationen" once the course landed in our
  // current curriculum.
  "aufbaukurs-medizinische-indikation-fuer-botulinum":
    "Aufbaukurs Botulinum - Therapeutische Indikationen",
};

export function prettifyLegacyCourseSlug(slug: string): string {
  const normalised = slug.trim().toLowerCase();
  const override = LEGACY_SLUG_OVERRIDES[normalised];
  if (override) return override;
  // Fallback: title-case the slug, drop the trailing "-online" marker
  // since nearly every LW slug ends with it and it's noise once we're
  // tagging the entry as Onlinekurs in the UI.
  return normalised
    .replace(/-online$/i, "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
