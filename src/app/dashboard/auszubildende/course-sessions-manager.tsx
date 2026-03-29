"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { CourseTemplate, CourseSession, DozentUser } from "@/lib/types";

interface Props {
  initialTemplates: CourseTemplate[];
  initialSessions: CourseSession[];
  dozentUsers: DozentUser[];
}

type SortKey = "status" | "date" | "time" | "course" | "instructor" | "seats" | "duration";
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

export function CourseSessionsManager({ initialTemplates, initialSessions, dozentUsers }: Props) {
  const supabase = createClient();
  const [sessions, setSessions] = useState(initialSessions);
  const [templates] = useState(initialTemplates);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Create form state
  const [formTemplateId, setFormTemplateId] = useState("");
  const [formDateIso, setFormDateIso] = useState("");
  const [formInstructor, setFormInstructor] = useState("");
  const [formMaxSeats, setFormMaxSeats] = useState("5");
  const [formAddress, setFormAddress] = useState("HYSTUDIO, Rosa-Luxemburg-Straße 20, 10178 Berlin, Deutschland");
  const [formStartTime, setFormStartTime] = useState("10:00");
  const [formDuration, setFormDuration] = useState("360");

  const getTemplateName = (templateId: string) => {
    const t = templates.find((t) => t.id === templateId);
    return t?.course_label_de || t?.title || "Unbekannt";
  };

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
    const sorted = [...sessions];
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
  }, [sessions, sortKey, sortDir]);

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

  // Inline field update
  const updateField = async (id: string, field: string, value: string | number | boolean) => {
    const { error } = await supabase
      .from("course_sessions")
      .update({ [field]: value })
      .eq("id", id);
    if (!error) {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      );
    }
  };

  // Update date + auto-derive label
  const updateDate = async (id: string, dateIso: string) => {
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
      })
      .select()
      .single();
    if (!error && data) {
      setSessions((prev) => [...prev, data].sort((a, b) => a.date_iso.localeCompare(b.date_iso)));
      setShowCreateDialog(false);
      setFormDateIso("");
      setFormInstructor("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kurstermine</h1>
        <Button onClick={() => setShowCreateDialog(true)}>Neuen Termin erstellen</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="Status" sortKeyName="status" className="w-[100px]" />
            <SortableHead label="Datum" sortKeyName="date" />
            <SortableHead label="Startzeit" sortKeyName="time" className="w-[90px]" />
            <SortableHead label="Dauer" sortKeyName="duration" className="w-[80px]" />
            <SortableHead label="Kurs" sortKeyName="course" />
            <SortableHead label="Dozent:in" sortKeyName="instructor" />
            <SortableHead label="Plätze" sortKeyName="seats" className="w-[80px]" />
            <TableHead className="w-[80px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                Noch keine Kurstermine erstellt.
              </TableCell>
            </TableRow>
          ) : (
            sortedSessions.map((session) => (
              <TableRow key={session.id}>
                {/* Status */}
                <TableCell>
                  <select
                    value={session.is_live ? "live" : "offline"}
                    onChange={(e) => updateField(session.id, "is_live", e.target.value === "live")}
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
                    value={session.date_iso}
                    onChange={(e) => updateDate(session.id, e.target.value)}
                    className="border-0 bg-transparent font-medium text-sm p-0 focus:outline-none focus:ring-0 w-[130px]"
                  />
                </TableCell>

                {/* Start time - simple text input */}
                <TableCell>
                  <input
                    type="text"
                    value={session.start_time || ""}
                    onChange={(e) => updateField(session.id, "start_time", e.target.value)}
                    placeholder="10:00"
                    className="border-0 bg-transparent text-sm p-0 focus:outline-none focus:ring-0 w-[60px]"
                  />
                </TableCell>

                {/* Duration */}
                <TableCell>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={session.duration_minutes || ""}
                      onChange={(e) => updateField(session.id, "duration_minutes", parseInt(e.target.value) || 0)}
                      className="border-0 bg-transparent text-sm p-0 focus:outline-none focus:ring-0 w-[45px]"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                </TableCell>

                {/* Course */}
                <TableCell>
                  <select
                    value={session.template_id}
                    onChange={(e) => updateField(session.id, "template_id", e.target.value)}
                    className="border-0 bg-transparent text-sm p-0 focus:outline-none focus:ring-0 cursor-pointer max-w-[250px] truncate"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.course_label_de || t.title}
                      </option>
                    ))}
                  </select>
                </TableCell>

                {/* Instructor */}
                <TableCell>
                  <select
                    value={session.instructor_name || ""}
                    onChange={(e) => updateField(session.id, "instructor_name", e.target.value)}
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

                {/* Seats */}
                <TableCell>
                  <span className={session.booked_seats >= session.max_seats ? "text-emerald-600 font-medium" : ""}>
                    {session.booked_seats}/{session.max_seats}
                  </span>
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
              </TableRow>
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
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="">Kurs wählen...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.course_label_de || t.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Datum</Label>
              <Input type="date" value={formDateIso} onChange={(e) => setFormDateIso(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Dozent:in</Label>
                <select
                  value={formInstructor}
                  onChange={(e) => setFormInstructor(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
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
                <Input type="number" value={formMaxSeats} onChange={(e) => setFormMaxSeats(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Adresse</Label>
              <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Startzeit</Label>
                <Input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Dauer (Minuten)</Label>
                <Input type="number" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} />
              </div>
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
