// Shared shape + formatting for a bookable Praxiskurs-Termin.
//
// Both the public booking widget (kurse/_components/widget) and the
// Praxiskurs offer on /mein-konto render the same date dropdown, so the
// label text and the availability badges have to be built in one place.
// Anything that drifts here shows up as two different date lists for the
// same session.

import type { CourseSession } from "@/lib/types";

export interface CourseDate {
  id: string;
  label: string;
  available: boolean;
  availabilityTag?: string | null;
  availabilityLevel?: "low" | "medium" | "ok" | "none";
}

// The columns a session needs to render as a date. Kept structural so
// callers can select a narrow column list instead of the whole row.
export type SessionForDate = Pick<
  CourseSession,
  "id" | "label_de" | "date_iso" | "start_time" | "max_seats" | "booked_seats"
>;

export function formatSessionLabel(session: SessionForDate): string {
  const label = session.label_de || session.date_iso;
  // start_time comes back as HH:MM:SS from Postgres; the seconds are noise
  // in a date picker.
  return session.start_time ? `${label} · ${session.start_time.slice(0, 5)} Uhr` : label;
}

export function getAvailability(session: SessionForDate) {
  const remaining = session.max_seats - session.booked_seats;
  const available = remaining > 0;

  let availabilityTag: string | null = null;
  let availabilityLevel: "low" | "medium" | "ok" | "none" = "none";

  if (!available) {
    availabilityTag = "ausgebucht";
    availabilityLevel = "none";
  } else if (remaining === 1) {
    availabilityTag = "1 Platz frei";
    availabilityLevel = "low";
  } else if (remaining === 2) {
    availabilityTag = "2 Plätze frei";
    availabilityLevel = "medium";
  } else {
    availabilityTag = "2+ Plätze frei";
    availabilityLevel = "ok";
  }

  return { available, availabilityTag, availabilityLevel };
}

export function toCourseDate(session: SessionForDate): CourseDate {
  return {
    id: session.id,
    label: formatSessionLabel(session),
    ...getAvailability(session),
  };
}
