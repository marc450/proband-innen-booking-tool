// Single source of truth for the Proband:innen rolling visibility
// window. A satellite course (and its slots) are only allowed to
// surface to / be booked by patients when:
//
//   status === 'published'
//   AND course_date >= today
//   AND course_date <= today + PROBAND_HORIZON_MONTHS months
//
// Used by every public listing page, every per-course landing, and
// every booking-creation API route as a defense-in-depth chain so a
// patient can't get past the rule by deep-linking, by stale browser
// state, or by the listing being momentarily out of sync. The cron
// `expire-courses` flips published satellites past the lower bound;
// this module focuses on enforcing the upper bound everywhere else.
//
// Keep this module tiny — the moment we add anything DB-touching,
// the public-facing pages would need a server-only marker, and we
// want this to be importable from anywhere.

export const PROBAND_HORIZON_MONTHS = 2;

/**
 * Today in `YYYY-MM-DD` form, anchored to UTC. Matches what we store
 * in `courses.course_date` (a date column). Don't pass a tz here:
 * the column is dateless of tz, so any tz drift is wrong by design.
 */
export function probandTodayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Upper bound for what's bookable / visible to patients today
 * (`today + 2 months`, format `YYYY-MM-DD`).
 */
export function probandHorizonIso(now: Date = new Date()): string {
  const horizon = new Date(now);
  horizon.setMonth(horizon.getMonth() + PROBAND_HORIZON_MONTHS);
  return horizon.toISOString().slice(0, 10);
}

/**
 * True iff the given `course_date` (YYYY-MM-DD) is inside the public
 * visibility window. `null`/`undefined` is treated as out-of-window.
 */
export function isCourseDateBookableByProbands(
  courseDate: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!courseDate) return false;
  return courseDate >= probandTodayIso(now) && courseDate <= probandHorizonIso(now);
}
