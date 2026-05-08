"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export interface KurseRow {
  id: string;
  templateId: string | null;
  dateIso: string;
  startTime: string | null;
  durationMinutes: number | null;
  courseTitle: string;
  instructorName: string | null;
  betreuerName: string | null;
  aerztBooked: number;
  aerztMax: number;
  probandBooked: number | null;
  probandTotal: number | null;
  zahnmedizinerCount: number;
  cmeStatus: string | null;
  vnrPraxis: string | null;
  isLive: boolean;
}

type SortKey =
  | "status"
  | "date"
  | "time"
  | "duration"
  | "course"
  | "instructor"
  | "betreuer"
  | "aerzt"
  | "proband"
  | "zahnmedizin"
  | "cme"
  | "vnr";

type SortDir = "asc" | "desc";

const COL_LABELS: Record<SortKey, string> = {
  status: "Status",
  date: "Datum",
  time: "Startzeit",
  duration: "Dauer",
  course: "Kurs",
  instructor: "Dozent:in",
  betreuer: "Kursbetreuung",
  aerzt: "Plätze Ärzt:innen",
  proband: "Plätze Proband:innen",
  zahnmedizin: "Zahnmedizin",
  cme: "CME Beantragung",
  vnr: "VNR",
};

// Stable per-template colour palette, copied from
// /dashboard/auszubildende/course-sessions-overview so the unified
// table stays visually consistent with the rest of the dashboard.
const COURSE_COLORS: { bg: string; text: string }[] = [
  { bg: "bg-blue-100", text: "text-blue-800" },
  { bg: "bg-emerald-100", text: "text-emerald-800" },
  { bg: "bg-amber-100", text: "text-amber-800" },
  { bg: "bg-purple-100", text: "text-purple-800" },
  { bg: "bg-rose-100", text: "text-rose-800" },
  { bg: "bg-cyan-100", text: "text-cyan-800" },
  { bg: "bg-orange-100", text: "text-orange-800" },
  { bg: "bg-indigo-100", text: "text-indigo-800" },
  { bg: "bg-lime-100", text: "text-lime-800" },
  { bg: "bg-pink-100", text: "text-pink-800" },
];

// Format YYYY-MM-DD without going through a Date object — `new Date("2026-05-10")`
// is interpreted as UTC midnight which shifts to the previous day in Berlin.
function formatDateDe(dateIso: string): string {
  const [y, m, d] = dateIso.split("-");
  return `${d}.${m}.${y}`;
}

function startTimePill(t: string | null): { className: string; label: string } | null {
  if (!t) return null;
  if (t === "10:00") return { className: "bg-emerald-100 text-emerald-800", label: t };
  if (t === "15:30") return { className: "bg-rose-100 text-rose-800", label: t };
  return null;
}

function compare(a: KurseRow, b: KurseRow, key: SortKey, dir: SortDir): number {
  const sign = dir === "asc" ? 1 : -1;
  switch (key) {
    case "status":
      return (Number(b.isLive) - Number(a.isLive)) * sign;
    case "date":
      return a.dateIso.localeCompare(b.dateIso) * sign;
    case "time":
      return (a.startTime ?? "").localeCompare(b.startTime ?? "") * sign;
    case "duration":
      return ((a.durationMinutes ?? 0) - (b.durationMinutes ?? 0)) * sign;
    case "course":
      return a.courseTitle.localeCompare(b.courseTitle, "de") * sign;
    case "instructor":
      return (a.instructorName ?? "").localeCompare(b.instructorName ?? "", "de") * sign;
    case "betreuer":
      return (a.betreuerName ?? "").localeCompare(b.betreuerName ?? "", "de") * sign;
    case "aerzt":
      return (a.aerztBooked - b.aerztBooked) * sign;
    case "proband":
      return ((a.probandBooked ?? 0) - (b.probandBooked ?? 0)) * sign;
    case "zahnmedizin":
      return (a.zahnmedizinerCount - b.zahnmedizinerCount) * sign;
    case "cme":
      return (a.cmeStatus ?? "").localeCompare(b.cmeStatus ?? "", "de") * sign;
    case "vnr":
      return (a.vnrPraxis ?? "").localeCompare(b.vnrPraxis ?? "", "de") * sign;
  }
}

function SortableHead({
  sortKey,
  current,
  dir,
  onSort,
}: {
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        {COL_LABELS[sortKey]}
        <Icon className="h-3 w-3" />
      </button>
    </TableHead>
  );
}

export function KurseTable({ rows }: { rows: KurseRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Per-template colour map. Mirrors the algorithm in
  // course-sessions-overview so that the same template gets the same
  // hue across both views during the transition.
  const courseColorMap = useMemo(() => {
    const sortedNames = new Map<string, string>();
    for (const r of rows) {
      if (r.templateId && !sortedNames.has(r.templateId)) {
        sortedNames.set(r.templateId, r.courseTitle);
      }
    }
    const ids = [...sortedNames.entries()]
      .sort(([, a], [, b]) => a.localeCompare(b, "de"))
      .map(([id]) => id);
    const map = new Map<string, { bg: string; text: string }>();
    ids.forEach((id, i) => map.set(id, COURSE_COLORS[i % COURSE_COLORS.length]));
    return map;
  }, [rows]);

  const onSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(
    () => [...rows].sort((a, b) => compare(a, b, sortKey, sortDir)),
    [rows, sortKey, sortDir],
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-[10px] bg-card p-8 text-center text-sm text-muted-foreground">
        Keine Kurstermine vorhanden.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[10px] ring-1 ring-black/5 bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead sortKey="status" current={sortKey} dir={sortDir} onSort={onSort} />
            <SortableHead sortKey="date" current={sortKey} dir={sortDir} onSort={onSort} />
            <SortableHead sortKey="time" current={sortKey} dir={sortDir} onSort={onSort} />
            <SortableHead sortKey="duration" current={sortKey} dir={sortDir} onSort={onSort} />
            <SortableHead sortKey="course" current={sortKey} dir={sortDir} onSort={onSort} />
            <SortableHead sortKey="instructor" current={sortKey} dir={sortDir} onSort={onSort} />
            <SortableHead sortKey="betreuer" current={sortKey} dir={sortDir} onSort={onSort} />
            <SortableHead sortKey="aerzt" current={sortKey} dir={sortDir} onSort={onSort} />
            <SortableHead sortKey="proband" current={sortKey} dir={sortDir} onSort={onSort} />
            <SortableHead sortKey="zahnmedizin" current={sortKey} dir={sortDir} onSort={onSort} />
            <SortableHead sortKey="cme" current={sortKey} dir={sortDir} onSort={onSort} />
            <SortableHead sortKey="vnr" current={sortKey} dir={sortDir} onSort={onSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r) => {
            const aerztSoldOut = r.aerztMax > 0 && r.aerztBooked >= r.aerztMax;
            const probandSoldOut =
              r.probandTotal != null && r.probandTotal > 0 && r.probandBooked === r.probandTotal;
            // Row highlight = doctor seats are full. Proband:innen
            // status is independent and is not part of this signal.
            // Uses --soldout-bg / --soldout-bg-hover CSS variables so
            // the colour adapts cleanly to dark mode.
            const courseColor = (r.templateId && courseColorMap.get(r.templateId)) || COURSE_COLORS[0];
            const startPill = startTimePill(r.startTime);
            return (
              <TableRow
                key={r.id}
                data-soldout={aerztSoldOut ? "true" : undefined}
                className="hover:bg-muted/50 data-[soldout=true]:bg-[color:var(--soldout-bg)] data-[soldout=true]:hover:bg-[color:var(--soldout-bg-hover)]"
              >
                <TableCell>
                  <Link href={`/dashboard/kurse/${r.id}`} className="block">
                    <span
                      className={`inline-block text-xs font-medium rounded-full px-2.5 py-1 ${
                        r.isLive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {r.isLive ? "Live" : "Offline"}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/kurse/${r.id}`} className="block font-medium text-sm">
                    {formatDateDe(r.dateIso)}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/kurse/${r.id}`} className="block text-sm">
                    {startPill ? (
                      <span className={`${startPill.className} font-medium text-xs rounded-full px-2.5 py-1`}>
                        {startPill.label}
                      </span>
                    ) : (
                      r.startTime ?? "—"
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/kurse/${r.id}`} className="block text-sm">
                    {r.durationMinutes ? `${r.durationMinutes} min` : "—"}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/kurse/${r.id}`} className="block">
                    <span
                      className={`${courseColor.bg} ${courseColor.text} font-medium text-xs rounded-full px-2.5 py-1`}
                    >
                      {r.courseTitle}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/kurse/${r.id}`} className="block text-sm">
                    {r.instructorName ?? <span className="italic text-muted-foreground">—</span>}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/kurse/${r.id}`} className="block text-sm">
                    {r.betreuerName ?? <span className="italic text-muted-foreground">—</span>}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/kurse/${r.id}`} className="block tabular-nums">
                    <span className={aerztSoldOut ? "font-semibold text-emerald-700" : undefined}>
                      {r.aerztBooked} / {r.aerztMax}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/kurse/${r.id}`} className="block tabular-nums">
                    {r.probandTotal == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={probandSoldOut ? "font-semibold text-emerald-700" : undefined}>
                        {r.probandBooked} / {r.probandTotal}
                      </span>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/kurse/${r.id}`} className="block text-sm tabular-nums">
                    {r.zahnmedizinerCount > 0 ? (
                      r.zahnmedizinerCount
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/kurse/${r.id}`} className="block text-sm">
                    {r.cmeStatus ?? <span className="text-muted-foreground">—</span>}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/kurse/${r.id}`} className="block text-xs font-mono text-muted-foreground">
                    {r.vnrPraxis ?? "—"}
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
