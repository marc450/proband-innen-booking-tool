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

// All EPHIA courses happen in Berlin and slot times are stored as
// `timestamptz`. Without an explicit timeZone the renderer uses the
// viewer's local TZ — so a slot at 08:00 Berlin shows as 00:00 in
// Mexico (UTC-6) or 14:00 in Tokyo (UTC+9). Always pin display to
// Europe/Berlin so the time matches the venue clock and what the
// confirmation emails / calendar invites say.
const BERLIN = "Europe/Berlin";
const DE = "de-DE";

function asDate(input: Date | string): Date {
  return typeof input === "string" ? new Date(input) : input;
}

/** "08:00" — Berlin wall-clock time of a timestamptz / Date. */
export function formatBerlinTime(input: Date | string): string {
  return asDate(input).toLocaleTimeString(DE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BERLIN,
  });
}

/** "20.09.2026" — Berlin calendar date of a timestamptz / Date. */
export function formatBerlinDate(input: Date | string): string {
  return asDate(input).toLocaleDateString(DE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: BERLIN,
  });
}

/** "20.09.2026 08:00" — combined date + time, Berlin. */
export function formatBerlinDateTime(input: Date | string): string {
  return `${formatBerlinDate(input)} ${formatBerlinTime(input)}`;
}

/** "20. September 2026" — long German date, Berlin. */
export function formatBerlinLongDate(input: Date | string): string {
  return asDate(input).toLocaleDateString(DE, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: BERLIN,
  });
}

/** "Sonntag, 20. September 2026" — long German date with weekday, Berlin. */
export function formatBerlinLongDateWithWeekday(input: Date | string): string {
  return asDate(input).toLocaleDateString(DE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: BERLIN,
  });
}

/**
 * "2026-09-20" — Berlin calendar date as ISO string. Used by filter /
 * grouping logic that compares to a `<input type="date">` value.
 */
export function berlinDateIso(input: Date | string): string {
  // en-CA happens to format as YYYY-MM-DD, no manual padding needed.
  return asDate(input).toLocaleDateString("en-CA", { timeZone: BERLIN });
}
