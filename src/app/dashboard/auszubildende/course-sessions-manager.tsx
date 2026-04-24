"use client";

import { useState, useMemo } from "react";
import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, Trash2, ArrowUpDown } from "lucide-react";
import type { CourseTemplate, CourseSession, DozentUser } from "@/lib/types";

interface Props {
  initialTemplates: CourseTemplate[];
  initialSessions: CourseSession[];
  dozentUsers: DozentUser[];
  betreuerUsers?: DozentUser[];
  zahnmedizinerCounts?: Record<string, number>;
}

type SortKey = "status" | "date" | "time" | "course" | "instructor" | "betreuer" | "seats" | "duration";
type SortDir = "asc" | "desc";

const MONTHS_DE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function dateToLabelDe(dateIso: string): string {
  const d = new Date(dateIso + "T12:00:00");
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS_DE[d.getMonth()];
  const year = d.getFullYear();
  return `${day}. ${month} ${year}`;
}

function dozentDisplayName(d: DozentUser): string {
  return [d.title, d.first_name, d.last_name].filter(Boolean).join(" ");
}

// Courses whose public landing pages read sessions from ANOTHER template
// (see SESSION_SHARING in src/app/kurse/[slug]/page.tsx). These templates
// never need their own course_sessions rows, so we hide them from the
// "Kurs" dropdowns in the admin to prevent accidentally creating dead
// sessions that no public page ever renders.
const SESSION_INHERIT_KEYS = new Set<string>([
  "grundkurs_botulinum_zahnmedizin",
]);

export function CourseSessionsManager({ initialTemplates, initialSessions, dozentUsers, betreuerUsers = [], zahnmedizinerCounts = {} }: Props) {
  const supabase = createClient();
  const [sessions, setSessions] = useState(initialSessions);
  const [templates] = useState(initialTemplates);
  // Templates that can host their own sessions (all except the ones that
  // inherit from another template).
  const assignableTemplates = useMemo(
    () => templates.filter((t) => !SESSION_INHERIT_KEYS.has(t.course_key || "")),
    [templates],
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Filters
  const [filterInstructor, setFilterInstructor] = useState("");
  const [filterBetreuer, setFilterBetreuer] = useState("");
  const [filterTemplate, setFilterTemplate] = useState("");
  const [filterStatus, setFilterStatus] = useState("live");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterTime, setFilterTime] = useState("");
  const [filterCme, setFilterCme] = useState("");
  const [filterZahnmedizin, setFilterZahnmedizin] = useState("");

  // Counter to force-reset defaultValue inputs on cancel
  const [resetKey, setResetKey] = useState(0);

  // Pending change confirmation
  const [pendingChange, setPendingChange] = useState<{
    id: string;
    field: string;
    value: string | number | boolean;
    label: string;
    displayValue: string;
    isDateChange?: boolean;
  } | null>(null);

  const fieldLabels: Record<string, string> = {
    is_live: "Status",
    date_iso: "Datum",
    start_time: "Startzeit",
    duration_minutes: "Dauer",
    template_id: "Kurs",
    instructor_name: "Dozent:in",
    betreuer_name: "Kursbetreuung",
    booked_seats: "Gebuchte Plätze",
    max_seats: "Max. Plätze",
    cme_status: "CME Beantragung",
    vnr_praxis: "VNR Praxis",
  };

  // Create form state
  const [formTemplateId, setFormTemplateId] = useState("");
  const [formDateIso, setFormDateIso] = useState("");
  const [formInstructor, setFormInstructor] = useState("");
  const [formMaxSeats, setFormMaxSeats] = useState("5");
  const [formAddress, setFormAddress] = useState("HYSTUDIO, Rosa-Luxemburg-Straße 20, 10178 Berlin, Deutschland");
  const [formStartTime, setFormStartTime] = useState("10:00");
  const [formDuration, setFormDuration] = useState("360");
  const [formVnrPraxis, setFormVnrPraxis] = useState("");

  const getTemplateName = (templateId: string) => {
    const t = templates.find((t) => t.id === templateId);
    return t?.course_label_de || t?.title || "Unbekannt";
  };

  // Stable color mapping for course type badges
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

  const courseColorMap = useMemo(() => {
    const uniqueIds = [...new Set(sessions.map((s) => s.template_id))];
    // Sort alphabetically by name so colors stay stable
    uniqueIds.sort((a, b) => getTemplateName(a).localeCompare(getTemplateName(b)));
    const map = new Map<string, { bg: string; text: string }>();
    uniqueIds.forEach((id, i) => map.set(id, COURSE_COLORS[i % COURSE_COLORS.length]));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, templates]);

  // Sorting
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
      if (filterBetreuer && s.betreuer_name !== filterBetreuer) return false;
      if (filterTemplate && s.template_id !== filterTemplate) return false;
      if (filterStatus === "live" && !s.is_live) return false;
      if (filterStatus === "offline" && s.is_live) return false;
      if (filterDateFrom && s.date_iso < filterDateFrom) return false;
      if (filterTime && s.start_time !== filterTime) return false;
      if (filterCme && (s.cme_status || "Nicht beantragt") !== filterCme) return false;
      if (filterZahnmedizin === "with" && (zahnmedizinerCounts[s.id] ?? 0) === 0) return false;
      if (filterZahnmedizin === "without" && (zahnmedizinerCounts[s.id] ?? 0) > 0) return false;
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
        case "betreuer":
          return (a.betreuer_name || "").localeCompare(b.betreuer_name || "") * dir;
        case "seats":
          return (a.booked_seats / a.max_seats - b.booked_seats / b.max_seats) * dir;
        case "duration":
          return ((a.duration_minutes || 0) - (b.duration_minutes || 0)) * dir;
        default:
          return 0;
      }
    });
    return sorted;
  }, [sessions, sortKey, sortDir, filterInstructor, filterBetreuer, filterTemplate, filterStatus, filterDateFrom, filterTime, filterCme, filterZahnmedizin, zahnmedizinerCounts]);

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

  // Format display value for the confirmation dialog
  const formatDisplayValue = useCallback((field: string, value: string | number | boolean): string => {
    if (field === "is_live") return value ? "Live" : "Offline";
    if (field === "template_id") {
      const t = templates.find((t) => t.id === value);
      return t?.course_label_de || t?.title || String(value);
    }
    if (field === "duration_minutes") return `${value} min`;
    if (value === "" || value === null) return "(leer)";
    return String(value);
  }, [templates]);

  // Request a change — shows confirmation dialog instead of saving immediately
  const requestChange = useCallback((id: string, field: string, value: string | number | boolean, isDateChange = false) => {
    setPendingChange({
      id,
      field,
      value,
      label: fieldLabels[field] || field,
      displayValue: formatDisplayValue(field, value),
      isDateChange,
    });
  }, [formatDisplayValue]);

  // Execute the confirmed change
  const confirmChange = async () => {
    if (!pendingChange) return;
    const { id, field, value, isDateChange } = pendingChange;

    if (isDateChange) {
      const dateIso = String(value);
      const label = dateToLabelDe(dateIso);
      const { error } = await supabase
        .from("course_sessions")
        .update({ date_iso: dateIso, label_de: label })
        .eq("id", id);
      if (!error) {
        setSessions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, date_iso: dateIso, label_de: label } : s))
        );
      }
    } else {
      const { error } = await supabase
        .from("course_sessions")
        .update({ [field]: value })
        .eq("id", id);
      if (!error) {
        setSessions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
        );
      }
    }
    setPendingChange(null);
  };

  // Duplicate
  const duplicateSession = async (session: CourseSession) => {
    const { data, error } = await supabase
      .from("course_sessions")
      .insert({
        template_id: session.template_id,
        date_iso: session.date_iso,
        label_de: session.label_de,
        instructor_name: session.instructor_name,
        max_seats: session.max_seats,
        booked_seats: 0,
        address: session.address,
        start_time: session.start_time,
        duration_minutes: session.duration_minutes,
        is_live: false,
      })
      .select()
      .single();
    if (!error && data) {
      setSessions((prev) => [...prev, data].sort((a, b) => a.date_iso.localeCompare(b.date_iso)));
    }
  };

  // Delete
  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("course_sessions").delete().eq("id", deleteId);
    if (!error) {
      setSessions((prev) => prev.filter((s) => s.id !== deleteId));
    }
    setDeleteId(null);
  };

  // Create
  const handleCreate = async () => {
    if (!formTemplateId || !formDateIso) return;
    const label = dateToLabelDe(formDateIso);
    const { data, error } = await supabase
      .from("course_sessions")
      .insert({
        template_id: formTemplateId,
        date_iso: formDateIso,
        label_de: label,
        instructor_name: formInstructor || null,
        max_seats: parseInt(formMaxSeats) || 5,
        address: formAddress || null,
        start_time: formStartTime || null,
        duration_minutes: parseInt(formDuration) || null,
        vnr_praxis: formVnrPraxis.trim() || null,
      })
      .select()
      .single();
    if (!error && data) {
      setSessions((prev) => [...prev, data].sort((a, b) => a.date_iso.localeCompare(b.date_iso)));
      setShowCreateDialog(false);
      setFormDateIso("");
      setFormInstructor("");
      setFormVnrPraxis("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setShowCreateDialog(true)}>Neuen Termin erstellen</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="Status" sortKeyName="status" className="w-[100px]" />
            <SortableHead label="Datum" sortKeyName="date" />
            <SortableHead label="Startzeit" sortKeyName="time" className="w-[90px]" />
            <SortableHead label="Dauer (Min)" sortKeyName="duration" className="w-[90px]" />
            <SortableHead label="Kurs" sortKeyName="course" />
            <SortableHead label="Dozent:in" sortKeyName="instructor" />
            <SortableHead label="Kursbetreuung" sortKeyName="betreuer" />
            <SortableHead label="Gebucht / Max" sortKeyName="seats" className="w-[100px]" />
            <TableHead>CME Beantragung</TableHead>
            <TableHead>Zahnmedizin</TableHead>
            <TableHead className="w-[140px]">VNR Praxis</TableHead>
            <TableHead className="w-[80px]">Aktionen</TableHead>
          </TableRow>
          {/* Filter row */}
          <TableRow className="hover:bg-transparent">
            {/* Status filter */}
            <TableHead className="py-1.5">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded px-1.5 py-1 text-xs bg-gray-100 border-0 cursor-pointer font-normal text-foreground"
              >
                <option value="">Alle</option>
                <option value="live">Live</option>
                <option value="offline">Offline</option>
              </select>
            </TableHead>
            {/* Ab Datum filter */}
            <TableHead className="py-1.5">
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full rounded px-1.5 py-1 text-xs bg-gray-100 border-0 font-normal text-foreground"
                title="Ab Datum"
              />
            </TableHead>
            {/* Time filter (above Startzeit) */}
            <TableHead className="py-1.5 w-[90px]">
              <select
                value={filterTime}
                onChange={(e) => setFilterTime(e.target.value)}
                className="w-full rounded px-1.5 py-1 text-xs bg-gray-100 border-0 font-normal text-foreground"
              >
                <option value="">Alle</option>
                {[...new Set(sessions.map((s) => s.start_time).filter((t): t is string => !!t))].sort().map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </TableHead>
            {/* Dauer — empty */}
            <TableHead className="py-1.5" />
            {/* Kurs filter */}
            <TableHead className="py-1.5">
              <select
                value={filterTemplate}
                onChange={(e) => setFilterTemplate(e.target.value)}
                className="w-full rounded px-1.5 py-1 text-xs bg-gray-100 border-0 cursor-pointer font-normal text-foreground"
              >
                <option value="">Alle</option>
                {templates
                  .filter((t) => sessions.some((s) => s.template_id === t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>{t.course_label_de || t.title}</option>
                  ))}
              </select>
            </TableHead>
            {/* Dozent:in filter */}
            <TableHead className="py-1.5">
              <select
                value={filterInstructor}
                onChange={(e) => setFilterInstructor(e.target.value)}
                className="w-full rounded px-1.5 py-1 text-xs bg-gray-100 border-0 cursor-pointer font-normal text-foreground"
              >
                <option value="">Alle</option>
                {Array.from(new Set(sessions.map((s) => s.instructor_name).filter(Boolean))).sort().map((name) => (
                  <option key={name!} value={name!}>{name}</option>
                ))}
              </select>
            </TableHead>
            {/* Kursbetreuung filter */}
            <TableHead className="py-1.5">
              <select
                value={filterBetreuer}
                onChange={(e) => setFilterBetreuer(e.target.value)}
                className="w-full rounded px-1.5 py-1 text-xs bg-gray-100 border-0 cursor-pointer font-normal text-foreground"
              >
                <option value="">Alle</option>
                {Array.from(new Set(sessions.map((s) => s.betreuer_name).filter(Boolean))).sort().map((name) => (
                  <option key={name!} value={name!}>{name}</option>
                ))}
              </select>
            </TableHead>
            {/* Plätze — empty */}
            <TableHead className="py-1.5" />
            {/* CME filter */}
            <TableHead className="py-1.5">
              <select
                value={filterCme}
                onChange={(e) => setFilterCme(e.target.value)}
                className="w-full rounded px-1.5 py-1 text-xs bg-gray-100 border-0 cursor-pointer font-normal text-foreground"
              >
                <option value="">Alle</option>
                <option value="Nicht beantragt">Nicht beantragt</option>
                <option value="LÄK Berlin">LÄK Berlin</option>
                <option value="LÄK Brandenburg">LÄK Brandenburg</option>
                <option value="Buchung auf anderen Kurs">Buchung auf anderen Kurs</option>
              </select>
            </TableHead>
            {/* Zahnmedizin filter */}
            <TableHead className="py-1.5">
              <select
                value={filterZahnmedizin}
                onChange={(e) => setFilterZahnmedizin(e.target.value)}
                className="w-full rounded px-1.5 py-1 text-xs bg-gray-100 border-0 cursor-pointer font-normal text-foreground"
              >
                <option value="">Alle</option>
                <option value="with">Mit Zahnmediziner:innen</option>
                <option value="without">Ohne</option>
              </select>
            </TableHead>
            {/* VNR Praxis — empty filter cell (not filterable for now) */}
            <TableHead className="py-1.5" />
            {/* Reset button */}
            <TableHead className="py-1.5">
              {(filterInstructor || filterBetreuer || filterTemplate || filterStatus || filterDateFrom || filterTime || filterCme || filterZahnmedizin) && (
                <button
                  onClick={() => {
                    setFilterInstructor("");
                    setFilterBetreuer("");
                    setFilterTemplate("");
                    setFilterStatus("");
                    setFilterDateFrom("");
                    setFilterTime("");
                    setFilterCme("");
                    setFilterZahnmedizin("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap"
                >
                  Zurücksetzen
                </button>
              )}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                Noch keine Kurstermine erstellt.
              </TableCell>
            </TableRow>
          ) : (
            sortedSessions.map((session) => (
              <tr
                key={session.id}
                data-slot="table-row"
                data-soldout={Number(session.booked_seats) >= Number(session.max_seats) && Number(session.max_seats) > 0 ? "true" : undefined}
                className="border-b transition-colors hover:bg-muted/50 data-[soldout=true]:bg-[color:var(--soldout-bg)] data-[soldout=true]:hover:bg-[color:var(--soldout-bg-hover)]"
              >
                {/* Status */}
                <TableCell>
                  <select
                    value={session.is_live ? "live" : "offline"}
                    onChange={(e) => requestChange(session.id, "is_live", e.target.value === "live")}
                    className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer ${
                      session.is_live
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <option value="live">Live</option>
                    <option value="offline">Offline</option>
                  </select>
                </TableCell>

                {/* Date */}
                <TableCell>
                  <input
                    type="date"
                    defaultValue={session.date_iso}
                    key={`date-${session.id}-${session.date_iso}-${resetKey}`}
                    onChange={(e) => {
                      if (e.target.value && e.target.value !== session.date_iso) {
                        requestChange(session.id, "date_iso", e.target.value, true);
                      }
                    }}
                    onClick={(e) => {
                      const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
                      el.showPicker?.();
                    }}
                    className="date-no-icon border-0 bg-transparent font-medium text-sm p-0 focus:outline-none focus:ring-0 w-[110px] cursor-pointer"
                  />
                </TableCell>

                {/* Start time - simple text input */}
                <TableCell>
                  {(() => {
                    const t = session.start_time || "";
                    const timeBadge = t === "10:00" ? "bg-emerald-100 text-emerald-800"
                      : t === "15:30" ? "bg-rose-100 text-rose-800"
                      : "";
                    return (
                      <input
                        type="text"
                        defaultValue={t}
                        key={`time-${session.id}-${t}-${resetKey}`}
                        onBlur={(e) => {
                          if (e.target.value !== t) {
                            requestChange(session.id, "start_time", e.target.value);
                          }
                        }}
                        placeholder="10:00"
                        className={`border-0 text-sm p-0 focus:outline-none focus:ring-0 w-[60px] ${timeBadge ? `${timeBadge} font-medium rounded-full px-2.5 py-1 w-[70px] text-center text-xs` : "bg-transparent"}`}
                      />
                    );
                  })()}
                </TableCell>

                {/* Duration */}
                <TableCell>
                  <input
                    type="number"
                    defaultValue={session.duration_minutes || ""}
                    key={`dur-${session.id}-${session.duration_minutes}-${resetKey}`}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      if (val !== (session.duration_minutes || 0)) {
                        requestChange(session.id, "duration_minutes", val);
                      }
                    }}
                    className="border-0 bg-transparent text-sm p-0 focus:outline-none focus:ring-0 w-[55px]"
                  />
                </TableCell>

                {/* Course */}
                <TableCell>
                  {(() => {
                    const color = courseColorMap.get(session.template_id) || COURSE_COLORS[0];
                    return (
                      <select
                        value={session.template_id}
                        onChange={(e) => requestChange(session.id, "template_id", e.target.value)}
                        className={`${color.bg} ${color.text} font-medium text-xs rounded-full px-2.5 py-1 border-0 focus:outline-none focus:ring-0 cursor-pointer max-w-[250px] truncate`}
                      >
                        {assignableTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.course_label_de || t.title}
                          </option>
                        ))}
                        {/* Fallback: render the template this session currently points
                            at even if it's in the inherit set, so legacy Zahnmedizin
                            sessions stay visible until migrated. */}
                        {!assignableTemplates.some((t) => t.id === session.template_id) && (() => {
                          const t = templates.find((x) => x.id === session.template_id);
                          return t ? (
                            <option key={t.id} value={t.id}>
                              {t.course_label_de || t.title}
                            </option>
                          ) : null;
                        })()}
                      </select>
                    );
                  })()}
                </TableCell>

                {/* Instructor */}
                <TableCell>
                  <select
                    value={session.instructor_name || ""}
                    onChange={(e) => requestChange(session.id, "instructor_name", e.target.value)}
                    className="border-0 bg-transparent text-sm p-0 focus:outline-none focus:ring-0 cursor-pointer max-w-[200px] truncate"
                  >
                    <option value="">–</option>
                    {dozentUsers.map((d) => {
                      const name = dozentDisplayName(d);
                      return (
                        <option key={d.id} value={name}>{name}</option>
                      );
                    })}
                    {session.instructor_name && !dozentUsers.some((d) => dozentDisplayName(d) === session.instructor_name) && (
                      <option value={session.instructor_name}>{session.instructor_name}</option>
                    )}
                  </select>
                </TableCell>

                {/* Kursbetreuung */}
                <TableCell>
                  <select
                    value={session.betreuer_name || ""}
                    onChange={(e) => requestChange(session.id, "betreuer_name", e.target.value)}
                    className="border-0 bg-transparent text-sm p-0 focus:outline-none focus:ring-0 cursor-pointer max-w-[200px] truncate"
                  >
                    <option value="">–</option>
                    {betreuerUsers.map((d) => {
                      const name = dozentDisplayName(d);
                      return (
                        <option key={d.id} value={name}>{name}</option>
                      );
                    })}
                    {session.betreuer_name && !betreuerUsers.some((d) => dozentDisplayName(d) === session.betreuer_name) && (
                      <option value={session.betreuer_name}>{session.betreuer_name}</option>
                    )}
                  </select>
                </TableCell>

                {/* Seats */}
                <TableCell>
                  {(() => {
                    const overbooked = session.booked_seats > session.max_seats;
                    const soldout = !overbooked && session.booked_seats >= session.max_seats;
                    const numberClass = overbooked
                      ? "text-amber-600 font-semibold"
                      : soldout
                        ? "text-emerald-600 font-medium"
                        : "";
                    const title = overbooked
                      ? `Überbucht um ${session.booked_seats - session.max_seats} (z.B. durch eine Einladung)`
                      : undefined;
                    return (
                      <div className="flex items-center gap-0.5" title={title}>
                        <input
                          type="number"
                          min={0}
                          defaultValue={session.booked_seats}
                          key={`booked-${session.id}-${session.booked_seats}-${resetKey}`}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            if (val !== session.booked_seats) {
                              requestChange(session.id, "booked_seats", val);
                            }
                          }}
                          className={`w-8 text-center bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none ${numberClass}`}
                        />
                        <span className="text-muted-foreground">/</span>
                        <input
                          type="number"
                          min={0}
                          defaultValue={session.max_seats}
                          key={`max-${session.id}-${session.max_seats}-${resetKey}`}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            if (val !== session.max_seats) {
                              requestChange(session.id, "max_seats", val);
                            }
                          }}
                          className={`w-8 text-center bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none ${numberClass}`}
                        />
                      </div>
                    );
                  })()}
                </TableCell>

                {/* CME Beantragung */}
                <TableCell>
                  <select
                    value={session.cme_status || "Nicht beantragt"}
                    onChange={(e) => requestChange(session.id, "cme_status", e.target.value)}
                    className="border-0 bg-transparent text-sm p-0 focus:outline-none focus:ring-0 cursor-pointer max-w-[200px]"
                  >
                    <option value="Nicht beantragt">Nicht beantragt</option>
                    <option value="LÄK Berlin">LÄK Berlin</option>
                    <option value="LÄK Brandenburg">LÄK Brandenburg</option>
                    <option value="Buchung auf anderen Kurs">Buchung auf anderen Kurs</option>
                  </select>
                </TableCell>

                {/* Zahnmedizin count */}
                <TableCell>
                  {(() => {
                    const count = zahnmedizinerCounts[session.id] ?? 0;
                    if (count === 0) {
                      return <span className="text-xs text-muted-foreground">–</span>;
                    }
                    return (
                      <span
                        className="text-xs font-medium bg-amber-100 text-amber-700 rounded-full px-2.5 py-1"
                        title={`${count} Zahnmediziner:innen in diesem Kurs`}
                      >
                        {count} {count === 1 ? "Zahnmediziner:in" : "Zahnmediziner:innen"}
                      </span>
                    );
                  })()}
                </TableCell>

                {/* VNR Praxis — inline editable, fehlt pill when empty */}
                <TableCell>
                  <input
                    type="text"
                    defaultValue={session.vnr_praxis || ""}
                    key={`vnr-${session.id}-${session.vnr_praxis ?? ""}-${resetKey}`}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      const current = session.vnr_praxis ?? "";
                      if (val !== current) {
                        requestChange(session.id, "vnr_praxis", val || "");
                      }
                    }}
                    placeholder={session.vnr_praxis ? "" : "Fehlt"}
                    className={`w-full text-xs font-mono bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none ${
                      session.vnr_praxis
                        ? "text-gray-700"
                        : "placeholder:text-red-600 placeholder:font-semibold"
                    }`}
                  />
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => duplicateSession(session)}
                      className="p-1.5 rounded hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
                      title="Duplizieren"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(session.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </tr>
            ))
          )}
        </TableBody>
      </Table>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Termin löschen"
        description="Möchtest Du diesen Kurstermin wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Change confirmation */}
      <ConfirmDialog
        open={!!pendingChange}
        title="Änderung bestätigen"
        description={pendingChange ? `${pendingChange.label} ändern zu: ${pendingChange.displayValue}` : ""}
        confirmLabel="Speichern"
        onConfirm={confirmChange}
        onCancel={() => { setPendingChange(null); setResetKey((k) => k + 1); }}
      />

      {/* Create dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Neuen Kurstermin erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Kurs</Label>
              <select
                value={formTemplateId}
                onChange={(e) => setFormTemplateId(e.target.value)}
                className="h-10 w-full border border-input rounded-lg px-2.5 text-sm bg-transparent"
              >
                <option value="">Kurs wählen...</option>
                {assignableTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.course_label_de || t.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Datum</Label>
              <Input className="h-10" type="date" value={formDateIso} onChange={(e) => setFormDateIso(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Dozent:in</Label>
                <select
                  value={formInstructor}
                  onChange={(e) => setFormInstructor(e.target.value)}
                  className="h-10 w-full border border-input rounded-lg px-2.5 text-sm bg-transparent"
                >
                  <option value="">Dozent:in wählen...</option>
                  {dozentUsers.map((d) => {
                    const name = dozentDisplayName(d);
                    return (
                      <option key={d.id} value={name}>{name}</option>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Max. Plätze</Label>
                <Input className="h-10" type="number" value={formMaxSeats} onChange={(e) => setFormMaxSeats(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Adresse</Label>
              <Input className="h-10" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Startzeit</Label>
                <Input className="h-10" type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Dauer (Minuten)</Label>
                <Input className="h-10" type="number" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>VNR Praxis (LÄK Berlin)</Label>
              <Input
                className="h-10"
                value={formVnrPraxis}
                onChange={(e) => setFormVnrPraxis(e.target.value)}
                placeholder="z.B. 2761102025043200004"
              />
              <p className="text-xs text-muted-foreground">
                Fortbildungsnummer für diesen Praxiskurs-Termin. Wird auf das Zertifikat gedruckt.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={!formTemplateId || !formDateIso}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
