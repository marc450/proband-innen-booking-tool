// Berlin public holidays (Feiertage) and school holidays (Schulferien)
// for the Kursplanung year overview, sourced from the OpenHolidays API
// (https://openholidaysapi.org, free official EU project, no API key).
//
// Public holidays are single days; school holidays are date ranges. Both
// come back with startDate/endDate (ISO) and a name array. We fetch the
// Berlin subdivision (DE-BE) and cache the response for a day via Next's
// fetch cache, since a year's holidays never change mid-year. Any failure
// degrades to empty arrays so the calendar still renders.

const OPEN_HOLIDAYS_BASE = "https://openholidaysapi.org";
const BERLIN_SUBDIVISION = "DE-BE";
const REVALIDATE_SECONDS = 60 * 60 * 24; // 1 day

interface OpenHolidaysName {
  language: string;
  text: string;
}

interface OpenHolidaysEntry {
  startDate: string;
  endDate: string;
  name?: OpenHolidaysName[];
}

export interface PublicHoliday {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  name: string;
}

export interface SchoolHoliday {
  /** ISO date (YYYY-MM-DD), inclusive. */
  start: string;
  /** ISO date (YYYY-MM-DD), inclusive. */
  end: string;
  name: string;
}

export interface YearHolidays {
  publicHolidays: PublicHoliday[];
  schoolHolidays: SchoolHoliday[];
}

function germanName(name: OpenHolidaysName[] | undefined): string {
  if (!name || name.length === 0) return "";
  return name.find((n) => n.language === "DE")?.text ?? name[0].text ?? "";
}

async function fetchList(path: string, year: number): Promise<OpenHolidaysEntry[]> {
  const params = new URLSearchParams({
    countryIsoCode: "DE",
    languageIsoCode: "DE",
    validFrom: `${year}-01-01`,
    validTo: `${year}-12-31`,
    subdivisionCode: BERLIN_SUBDIVISION,
  });
  const res = await fetch(`${OPEN_HOLIDAYS_BASE}/${path}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    console.error(`holidays: ${path} returned HTTP ${res.status}`);
    return [];
  }
  return (await res.json()) as OpenHolidaysEntry[];
}

/**
 * Fetch Berlin public + school holidays for a calendar year. Best-effort:
 * returns empty arrays on any network/parse failure so the year overview
 * still renders without holiday overlays.
 */
export async function fetchBerlinHolidays(year: number): Promise<YearHolidays> {
  try {
    const [pub, school] = await Promise.all([
      fetchList("PublicHolidays", year),
      fetchList("SchoolHolidays", year),
    ]);
    return {
      publicHolidays: pub.map((h) => ({
        date: h.startDate,
        name: germanName(h.name),
      })),
      schoolHolidays: school.map((h) => ({
        start: h.startDate,
        end: h.endDate,
        name: germanName(h.name),
      })),
    };
  } catch (err) {
    console.error("fetchBerlinHolidays failed:", err);
    return { publicHolidays: [], schoolHolidays: [] };
  }
}
