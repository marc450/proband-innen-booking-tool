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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { TableHeaderBar } from "@/components/table/table-header-bar";
import { CHECKLIST_TOTAL } from "@/lib/course-checklist";

export interface ChecklistSession {
  id: string;
  date_iso: string;
  label_de: string | null;
  instructor_name: string | null;
  template_title: string | null;
  checked_count: number;
}

type StatusFilter = "open" | "done" | "all";

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      const complete = s.checked_count >= CHECKLIST_TOTAL;
      if (statusFilter === "open" && complete) return false;
      if (statusFilter === "done" && !complete) return false;
      if (!q) return true;
      const hay = [
        sessionTitle(s),
        s.instructor_name ?? "",
        s.date_iso ? format(new Date(s.date_iso), "dd.MM.yyyy") : "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [sessions, search, statusFilter]);

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
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="h-9 w-[160px]">
              <span>
                {statusFilter === "open"
                  ? "Nicht erledigt"
                  : statusFilter === "done"
                    ? "Erledigt"
                    : "Alle Kurse"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Nicht erledigt</SelectItem>
              <SelectItem value="done">Erledigt</SelectItem>
              <SelectItem value="all">Alle Kurse</SelectItem>
            </SelectContent>
          </Select>
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
