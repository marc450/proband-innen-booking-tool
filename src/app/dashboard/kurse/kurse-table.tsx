"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDown, ArrowUp, ArrowUpDown, Check } from "lucide-react";

export interface KurseRow {
  id: string;
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
  hasZahnmedizin: boolean;
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
      return (Number(b.hasZahnmedizin) - Number(a.hasZahnmedizin)) * sign;
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
        Keine Kurstermine in den letzten/kommenden Wochen.
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
            return (
              <TableRow key={r.id} className="hover:bg-muted/50">
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
                  <Link href={`/dashboard/kurse/${r.id}`} className="block">
                    {format(new Date(r.dateIso), "dd.MM.yyyy", { locale: de })}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/kurse/${r.id}`} className="block">
                    {r.startTime ?? "—"}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/kurse/${r.id}`} className="block">
                    {r.durationMinutes ? `${r.durationMinutes} min` : "—"}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/kurse/${r.id}`} className="block font-medium">
                    {r.courseTitle}
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
                  <Link href={`/dashboard/kurse/${r.id}`} className="block">
                    {r.hasZahnmedizin ? (
                      <Check className="h-4 w-4 text-emerald-700" />
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
