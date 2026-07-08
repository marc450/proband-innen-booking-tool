"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CheckCircle2, GraduationCap } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableHeaderBar } from "@/components/table/table-header-bar";
import { CHECKLIST_TOTAL } from "@/lib/course-checklist";

export interface ChecklistSession {
  id: string;
  date_iso: string;
  label_de: string | null;
  instructor_name: string | null;
  betreuer_name: string | null;
  template_title: string | null;
  checked_count: number;
}

function sessionTitle(s: ChecklistSession): string {
  return s.template_title || s.label_de || "Kurstermin";
}

export function ChecklistsOverview({
  sessions,
}: {
  sessions: ChecklistSession[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  // Past courses are hidden by default; the Kursbetreuung cares about
  // upcoming and current courses. Toggle to bring the archive back.
  const [hidePast, setHidePast] = useState(true);

  // Local midnight today. A course on today's date still counts as
  // current, so only dates strictly before today are "past".
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const dateValue = (s: ChecklistSession) =>
    s.date_iso ? new Date(`${s.date_iso}T00:00:00`).getTime() : Infinity;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = sessions.filter((s) => {
      if (
        hidePast &&
        s.date_iso &&
        new Date(`${s.date_iso}T00:00:00`).getTime() < todayStart
      )
        return false;
      if (!q) return true;
      const hay = [
        sessionTitle(s),
        s.instructor_name ?? "",
        s.betreuer_name ?? "",
        s.date_iso ? format(new Date(s.date_iso), "dd.MM.yyyy") : "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    // Next courses on top: upcoming (incl. today) sorted soonest-first,
    // then past courses most-recent-first below them.
    return list.sort((a, b) => {
      const ta = dateValue(a);
      const tb = dateValue(b);
      const aUpcoming = ta >= todayStart;
      const bUpcoming = tb >= todayStart;
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
      return aUpcoming ? ta - tb : tb - ta;
    });
  }, [sessions, search, hidePast, todayStart]);

  return (
    <div className="space-y-4">
      <TableHeaderBar
        title="Kurs-Checklisten"
        count={filtered.length}
        countLabel="Kurse"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Suchen nach Kurs, Dozent:in, Datum..."
        filters={
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={hidePast}
              onChange={(e) => setHidePast(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span>Vergangene ausblenden</span>
          </label>
        }
      />

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          {sessions.length === 0
            ? "Noch keine Kurstermine angelegt."
            : "Keine Kurse passen zu den aktuellen Filtern."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kurs</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Dozent:in</TableHead>
              <TableHead>Kursbetreuung</TableHead>
              <TableHead>Fortschritt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => {
              const complete = s.checked_count >= CHECKLIST_TOTAL;
              return (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-black/[0.03]"
                  onClick={() =>
                    router.push(`/dashboard/tasks/checklists/${s.id}`)
                  }
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-[#0066FF] shrink-0" />
                      {sessionTitle(s)}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {s.date_iso
                      ? format(new Date(s.date_iso), "dd.MM.yyyy", {
                          locale: de,
                        })
                      : "·"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.instructor_name || "·"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.betreuer_name || "·"}
                  </TableCell>
                  <TableCell>
                    {complete ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Erledigt
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                        {s.checked_count}/{CHECKLIST_TOTAL}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
