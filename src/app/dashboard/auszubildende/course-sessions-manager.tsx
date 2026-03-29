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
import { Badge } from "@/components/ui/badge";
import { Pencil, Copy, Trash2, ArrowUpDown } from "lucide-react";
import type { CourseTemplate, CourseSession } from "@/lib/types";

interface Props {
  initialTemplates: CourseTemplate[];
  initialSessions: CourseSession[];
}

type SortKey = "status" | "date" | "course" | "instructor" | "seats";
type SortDir = "asc" | "desc";

export function CourseSessionsManager({ initialTemplates, initialSessions }: Props) {
  const supabase = createClient();
  const [sessions, setSessions] = useState(initialSessions);
  const [templates] = useState(initialTemplates);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSession, setEditingSession] = useState<CourseSession | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Form state
  const [formTemplateId, setFormTemplateId] = useState("");
  const [formDateIso, setFormDateIso] = useState("");
  const [formLabelDe, setFormLabelDe] = useState("");
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
        case "course":
          return getTemplateName(a.template_id).localeCompare(getTemplateName(b.template_id)) * dir;
        case "instructor":
          return (a.instructor_name || "").localeCompare(b.instructor_name || "") * dir;
        case "seats":
          return (a.booked_seats / a.max_seats - b.booked_seats / b.max_seats) * dir;
        default:
          return 0;
      }
    });
    return sorted;
  }, [sessions, sortKey, sortDir]);

  const SortableHead = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <TableHead>
      <button
        onClick={() => toggleSort(sortKeyName)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
      </button>
    </TableHead>
  );

  // Status toggle
  const toggleLive = async (session: CourseSession) => {
    const newStatus = !session.is_live;
    const { error } = await supabase
      .from("course_sessions")
      .update({ is_live: newStatus })
      .eq("id", session.id);
    if (!error) {
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, is_live: newStatus } : s))
      );
    }
  };

  // Open create dialog
  const openCreate = () => {
    setEditingSession(null);
    setFormTemplateId("");
    setFormDateIso("");
    setFormLabelDe("");
    setFormInstructor("");
    setFormMaxSeats("5");
    setFormAddress("HYSTUDIO, Rosa-Luxemburg-Straße 20, 10178 Berlin, Deutschland");
    setFormStartTime("10:00");
    setFormDuration("360");
    setShowDialog(true);
  };

  // Open edit dialog
  const openEdit = (session: CourseSession) => {
    setEditingSession(session);
    setFormTemplateId(session.template_id);
    setFormDateIso(session.date_iso);
    setFormLabelDe(session.label_de || "");
    setFormInstructor(session.instructor_name || "");
    setFormMaxSeats(String(session.max_seats));
    setFormAddress(session.address || "");
    setFormStartTime(session.start_time || "10:00");
    setFormDuration(String(session.duration_minutes || 360));
    setShowDialog(true);
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

  // Save (create or update)
  const handleSave = async () => {
    if (!formTemplateId || !formDateIso) return;

    const payload = {
      template_id: formTemplateId,
      date_iso: formDateIso,
      label_de: formLabelDe || null,
      instructor_name: formInstructor || null,
      max_seats: parseInt(formMaxSeats) || 5,
      address: formAddress || null,
      start_time: formStartTime || null,
      duration_minutes: parseInt(formDuration) || null,
    };

    if (editingSession) {
      const { data, error } = await supabase
        .from("course_sessions")
        .update(payload)
        .eq("id", editingSession.id)
        .select()
        .single();
      if (!error && data) {
        setSessions((prev) =>
          prev.map((s) => (s.id === editingSession.id ? data : s))
        );
        setShowDialog(false);
      }
    } else {
      const { data, error } = await supabase
        .from("course_sessions")
        .insert(payload)
        .select()
        .single();
      if (!error && data) {
        setSessions((prev) => [...prev, data].sort((a, b) => a.date_iso.localeCompare(b.date_iso)));
        setShowDialog(false);
      }
    }
  };

  // Delete
  const deleteSession = async (id: string) => {
    if (!confirm("Termin wirklich löschen?")) return;
    const { error } = await supabase.from("course_sessions").delete().eq("id", id);
    if (!error) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kurstermine</h1>
        <Button onClick={openCreate}>Neuen Termin erstellen</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="Status" sortKeyName="status" />
            <SortableHead label="Datum" sortKeyName="date" />
            <SortableHead label="Kurs" sortKeyName="course" />
            <SortableHead label="Dozent:in" sortKeyName="instructor" />
            <SortableHead label="Plätze" sortKeyName="seats" />
            <TableHead className="w-[100px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Noch keine Kurstermine erstellt.
              </TableCell>
            </TableRow>
          ) : (
            sortedSessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  <select
                    value={session.is_live ? "live" : "draft"}
                    onChange={() => toggleLive(session)}
                    className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer ${
                      session.is_live
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <option value="live">Live</option>
                    <option value="draft">Entwurf</option>
                  </select>
                </TableCell>
                <TableCell className="font-medium">
                  {session.label_de || session.date_iso}
                  {session.start_time && (
                    <span className="text-muted-foreground ml-2">{session.start_time} Uhr</span>
                  )}
                </TableCell>
                <TableCell>{getTemplateName(session.template_id)}</TableCell>
                <TableCell>{session.instructor_name || "–"}</TableCell>
                <TableCell>
                  <span className={session.booked_seats >= session.max_seats ? "text-red-600 font-medium" : ""}>
                    {session.booked_seats}/{session.max_seats}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(session)}
                      className="p-1.5 rounded hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
                      title="Bearbeiten"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => duplicateSession(session)}
                      className="p-1.5 rounded hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
                      title="Duplizieren"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteSession(session.id)}
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

      {/* Create/Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingSession ? "Kurstermin bearbeiten" : "Neuen Kurstermin erstellen"}
            </DialogTitle>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Datum</Label>
                <Input type="date" value={formDateIso} onChange={(e) => setFormDateIso(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Label (z.B. "15. Feb 2026")</Label>
                <Input value={formLabelDe} onChange={(e) => setFormLabelDe(e.target.value)} placeholder="15. Feb 2026" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Dozent:in</Label>
                <Input value={formInstructor} onChange={(e) => setFormInstructor(e.target.value)} placeholder="Dr. Sophia Wilk-Vollmann" />
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
            <Button variant="outline" onClick={() => setShowDialog(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={!formTemplateId || !formDateIso}>
              {editingSession ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
