"use client";

import { useState, useMemo } from "react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, X } from "lucide-react";
import type { CourseTemplate, CourseSession } from "@/lib/types";

interface Props {
  initialTemplates: CourseTemplate[];
  initialSessions: CourseSession[];
}

type SortKey = "status" | "date" | "time" | "course" | "instructor" | "seats" | "duration";
type SortDir = "asc" | "desc";

export function CourseSessionsOverview({ initialTemplates, initialSessions }: Props) {
  const sessions = initialSessions;
  const templates = initialTemplates;
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Filters
  const [filterInstructor, setFilterInstructor] = useState("");
  const [filterTemplate, setFilterTemplate] = useState("");
  const [filterStatus, setFilterStatus] = useState("live");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const getTemplateName = (templateId: string) => {
    const t = templates.find((t) => t.id === templateId);
    return t?.course_label_de || t?.title || "Unbekannt";
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedSessions = useMemo(() => {
    const filtered = sessions.filter((s) => {
      if (filterInstructor && s.instructor_name !== filterInstructor) return false;
      if (filterTemplate && s.template_id !== filterTemplate) return false;
      if (filterStatus === "live" && !s.is_live) return false;
      if (filterStatus === "offline" && s.is_live) return false;
      if (filterDateFrom && s.date_iso < filterDateFrom) return false;
      if (filterDateTo && s.date_iso > filterDateTo) return false;
      return true;
    });
    const sorted = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "status":
          return (Number(b.is_live) - Number(a.is_live)) * dir;
        case "date":
          return a.date_iso.localeCompare(b.date_iso) * dir;
        case "time":
          return (a.start_time || "").localeCompare(b.start_time || "") * dir;
        case "course":
          return getTemplateName(a.template_id).localeCompare(getTemplateName(b.template_id)) * dir;
        case "instructor":
          return (a.instructor_name || "").localeCompare(b.instructor_name || "") * dir;
        case "seats":
          return (a.booked_seats / a.max_seats - b.booked_seats / b.max_seats) * dir;
        case "duration":
          return ((a.duration_minutes || 0) - (b.duration_minutes || 0)) * dir;
        default:
          return 0;
      }
    });
    return sorted;
  }, [sessions, sortKey, sortDir, filterInstructor, filterTemplate, filterStatus, filterDateFrom, filterDateTo]);

  const SortableHead = ({ label, sortKeyName, className }: { label: string; sortKeyName: SortKey; className?: string }) => (
    <TableHead className={className}>
      <button
        onClick={() => toggleSort(sortKeyName)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
      </button>
    </TableHead>
  );

  const formatDate = (dateIso: string) => {
    const [y, m, d] = dateIso.split("-");
    return `${d}.${m}.${y}`;
  };

  // Visual hint when a filter is active. "live" is the default for filterStatus,
  // so it only counts as active if the user explicitly changed it to something else.
  const filterActiveClass = (isActive: boolean) =>
    isActive
      ? "ring-2 ring-primary bg-primary/10 text-primary font-medium"
      : "bg-gray-100 text-foreground";
  const activeFilterCount =
    (filterInstructor ? 1 : 0) +
    (filterTemplate ? 1 : 0) +
    (filterStatus && filterStatus !== "live" ? 1 : 0) +
    (filterDateFrom ? 1 : 0) +
    (filterDateTo ? 1 : 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-3">
        Kurstermine
        {activeFilterCount > 0 && (
          <span className="text-xs font-medium text-primary bg-primary/10 border border-primary/30 rounded-full px-2.5 py-1">
            {activeFilterCount} {activeFilterCount === 1 ? "Filter aktiv" : "Filter aktiv"}
          </span>
        )}
      </h1>

      <table className="w-full caption-bottom text-sm" data-slot="table">
        <thead data-slot="table-header" className="sticky top-[60px] z-20 bg-[color:var(--dashboard-bg)] [&_tr]:border-b [&_th]:bg-[color:var(--dashboard-bg)]">
          <TableRow>
            <SortableHead label="Status" sortKeyName="status" className="w-[100px]" />
            <SortableHead label="Datum" sortKeyName="date" />
            <SortableHead label="Startzeit" sortKeyName="time" className="w-[90px]" />
            <SortableHead label="Dauer" sortKeyName="duration" className="w-[80px]" />
            <SortableHead label="Kurs" sortKeyName="course" />
            <SortableHead label="Dozent:in" sortKeyName="instructor" />
            <SortableHead label="Kursbetreuung" sortKeyName="instructor" />
            <SortableHead label="Plätze" sortKeyName="seats" className="w-[80px]" />
          </TableRow>
          {/* Filter row */}
          <TableRow className="hover:bg-transparent">
            <TableHead className="py-1.5">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`w-full rounded px-1.5 py-1 text-xs border-0 cursor-pointer ${filterActiveClass(!!filterStatus && filterStatus !== "live")}`}
              >
                <option value="">Alle</option>
                <option value="live">Live</option>
                <option value="offline">Offline</option>
              </select>
            </TableHead>
            <TableHead className="py-1.5">
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className={`w-full rounded px-1.5 py-1 text-xs border-0 ${filterActiveClass(!!filterDateFrom)}`}
              />
            </TableHead>
            <TableHead className="py-1.5 w-[90px]">
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className={`w-full rounded px-1.5 py-1 text-xs border-0 ${filterActiveClass(!!filterDateTo)}`}
              />
            </TableHead>
            <TableHead className="py-1.5" />
            <TableHead className="py-1.5">
              <select
                value={filterTemplate}
                onChange={(e) => setFilterTemplate(e.target.value)}
                className={`w-full rounded px-1.5 py-1 text-xs border-0 cursor-pointer ${filterActiveClass(!!filterTemplate)}`}
              >
                <option value="">Alle</option>
                {templates
                  .filter((t) => sessions.some((s) => s.template_id === t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>{t.course_label_de || t.title}</option>
                  ))}
              </select>
            </TableHead>
            <TableHead className="py-1.5">
              <select
                value={filterInstructor}
                onChange={(e) => setFilterInstructor(e.target.value)}
                className={`w-full rounded px-1.5 py-1 text-xs border-0 cursor-pointer ${filterActiveClass(!!filterInstructor)}`}
              >
                <option value="">Alle</option>
                {Array.from(new Set(sessions.map((s) => s.instructor_name).filter(Boolean))).sort().map((name) => (
                  <option key={name!} value={name!}>{name}</option>
                ))}
              </select>
            </TableHead>
            <TableHead className="py-1.5" />
            <TableHead className="py-1.5">
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setFilterInstructor("");
                    setFilterTemplate("");
                    setFilterStatus("live");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap font-medium"
                >
                  <X className="h-3 w-3" />
                  Reset
                </button>
              )}
            </TableHead>
          </TableRow>
        </thead>
        <TableBody>
          {sortedSessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                Keine Kurstermine gefunden.
              </TableCell>
            </TableRow>
          ) : (
            sortedSessions.map((session) => (
              <TableRow key={session.id} style={Number(session.booked_seats) >= Number(session.max_seats) && Number(session.max_seats) > 0 ? { backgroundColor: "var(--soldout-bg)" } : undefined}>
                <TableCell>
                  <span
                    className={`text-xs font-medium rounded-full px-2.5 py-1 ${
                      session.is_live
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {session.is_live ? "Live" : "Offline"}
                  </span>
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {formatDate(session.date_iso)}
                </TableCell>
                <TableCell className="text-sm">
                  {session.start_time || "–"}
                </TableCell>
                <TableCell className="text-sm">
                  {session.duration_minutes ? `${session.duration_minutes} min` : "–"}
                </TableCell>
                <TableCell className="text-sm">
                  {getTemplateName(session.template_id)}
                </TableCell>
                <TableCell className="text-sm">
                  {session.instructor_name || "–"}
                </TableCell>
                <TableCell className="text-sm">
                  {session.betreuer_name || "–"}
                </TableCell>
                <TableCell>
                  <span className={session.booked_seats >= session.max_seats ? "text-emerald-600 font-medium" : ""}>
                    {session.booked_seats}/{session.max_seats}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </table>
    </div>
  );
}
