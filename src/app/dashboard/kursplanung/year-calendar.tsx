"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PublicHoliday, SchoolHoliday } from "@/lib/holidays";

export interface CalendarProposal {
  date: string; // ISO YYYY-MM-DD
  status: "open" | "confirmed" | "cancelled";
  courseLabel: string;
}

const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];
// Monday-first, German.
const WEEKDAYS_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function isoOf(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Expand inclusive [start, end] ISO ranges into a Map<isoDate, name>. School
// holidays are a handful of multi-week ranges per year, so the expanded set
// stays small.
function expandSchoolHolidays(
  ranges: SchoolHoliday[],
  year: number,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of ranges) {
    // Clamp to the rendered year and walk day by day in UTC to avoid DST drift.
    const start = new Date(`${r.start}T00:00:00Z`);
    const end = new Date(`${r.end}T00:00:00Z`);
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      if (iso.startsWith(String(year))) map.set(iso, r.name);
    }
  }
  return map;
}

export function YearCalendar({
  year,
  currentYear,
  todayIso,
  publicHolidays,
  schoolHolidays,
  proposals,
}: {
  year: number;
  currentYear: number;
  todayIso: string;
  publicHolidays: PublicHoliday[];
  schoolHolidays: SchoolHoliday[];
  proposals: CalendarProposal[];
}) {
  const publicByDate = useMemo(
    () => new Map(publicHolidays.map((h) => [h.date, h.name])),
    [publicHolidays],
  );
  const schoolByDate = useMemo(
    () => expandSchoolHolidays(schoolHolidays, year),
    [schoolHolidays, year],
  );
  const proposalsByDate = useMemo(() => {
    const map = new Map<string, CalendarProposal[]>();
    for (const p of proposals) {
      if (!p.date.startsWith(String(year))) continue;
      const list = map.get(p.date) ?? [];
      list.push(p);
      map.set(p.date, list);
    }
    return map;
  }, [proposals, year]);

  return (
    <div className="rounded-lg bg-white p-5 space-y-4">
      {/* Header + year nav */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Jahresübersicht {year}</h2>
          <p className="text-sm text-muted-foreground">
            Berliner Feiertage und Schulferien als Planungshilfe.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/dashboard/kursplanung?year=${year - 1}`}
            scroll={false}
            className="p-2 rounded-lg hover:bg-black/5 text-muted-foreground hover:text-foreground transition-colors"
            title={`${year - 1}`}
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          {year !== currentYear && (
            <Link
              href={`/dashboard/kursplanung?year=${currentYear}`}
              scroll={false}
              className="text-xs font-medium text-[#0066FF] hover:underline px-2"
            >
              Heute
            </Link>
          )}
          <Link
            href={`/dashboard/kursplanung?year=${year + 1}`}
            scroll={false}
            className="p-2 rounded-lg hover:bg-black/5 text-muted-foreground hover:text-foreground transition-colors"
            title={`${year + 1}`}
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-100 ring-1 ring-red-300" />
          Feiertag
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 ring-1 ring-amber-300" />
          Schulferien
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#0066FF]" />
          Vorgeschlagener Termin
        </span>
      </div>

      {/* 12 month grids */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MONTHS_DE.map((monthName, month) => {
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          // JS getDay: 0=Sun..6=Sat → Monday-first offset.
          const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
          const cells: Array<number | null> = [
            ...Array(firstWeekday).fill(null),
            ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
          ];

          return (
            <div key={month} className="space-y-1.5">
              <div className="text-sm font-semibold">{monthName}</div>
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {WEEKDAYS_DE.map((wd) => (
                  <div key={wd} className="text-[10px] font-medium text-muted-foreground py-0.5">
                    {wd}
                  </div>
                ))}
                {cells.map((day, idx) => {
                  if (day === null) return <div key={`e-${idx}`} />;
                  const iso = isoOf(year, month, day);
                  const publicName = publicByDate.get(iso);
                  const schoolName = schoolByDate.get(iso);
                  const dayProposals = proposalsByDate.get(iso);
                  const isToday = iso === todayIso;

                  const bg = publicName
                    ? "bg-red-100"
                    : schoolName
                      ? "bg-amber-100"
                      : "";
                  const textColor = publicName ? "text-red-700 font-semibold" : "";

                  const titleParts = [
                    publicName,
                    schoolName ? `Schulferien: ${schoolName}` : null,
                    ...(dayProposals?.map(
                      (p) =>
                        `${p.courseLabel}${p.status === "confirmed" ? " (bestätigt)" : ""}`,
                    ) ?? []),
                  ].filter(Boolean);

                  return (
                    <div
                      key={iso}
                      title={titleParts.length ? titleParts.join(" · ") : undefined}
                      className={`relative aspect-square flex items-center justify-center rounded text-[11px] ${bg} ${textColor} ${
                        isToday ? "ring-1 ring-[#0066FF]" : ""
                      }`}
                    >
                      {day}
                      {dayProposals && dayProposals.length > 0 && (
                        <span
                          className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                            dayProposals.some((p) => p.status === "confirmed")
                              ? "bg-emerald-500"
                              : "bg-[#0066FF]"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
