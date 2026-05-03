// Date-only strings ("YYYY-MM-DD", e.g. course_sessions.date_iso or
// courses.course_date) are parsed by `new Date(iso)` as UTC midnight.
// In any timezone west of Greenwich (e.g. Mexico, the Americas) that
// shifts to the previous calendar day, so a Sunday Sept 20 booking
// renders as Saturday Sept 19. Anchoring at local noon keeps the
// calendar date stable in every IANA timezone the app is realistically
// viewed from. Use this helper anywhere a DATE column is fed into
// `new Date()` for display.
export function parseDateOnly(iso: string): Date {
  return new Date(iso + "T12:00:00");
}
