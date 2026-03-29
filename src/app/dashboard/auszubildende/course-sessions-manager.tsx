"use client";

import { useState } from "react";
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
import type { CourseTemplate, CourseSession } from "@/lib/types";

interface Props {
  initialTemplates: CourseTemplate[];
  initialSessions: CourseSession[];
}

export function CourseSessionsManager({ initialTemplates, initialSessions }: Props) {
  const supabase = createClient();
  const [sessions, setSessions] = useState(initialSessions);
  const [templates] = useState(initialTemplates);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Create form state
  const [newTemplateId, setNewTemplateId] = useState("");
  const [newDateIso, setNewDateIso] = useState("");
  const [newLabelDe, setNewLabelDe] = useState("");
  const [newInstructor, setNewInstructor] = useState("");
  const [newMaxSeats, setNewMaxSeats] = useState("5");
  const [newAddress, setNewAddress] = useState("HYSTUDIO, Rosa-Luxemburg-Straße 20, 10178 Berlin, Deutschland");
  const [newStartTime, setNewStartTime] = useState("10:00");
  const [newDuration, setNewDuration] = useState("360");

  const getTemplateName = (templateId: string) => {
    const t = templates.find((t) => t.id === templateId);
    return t?.course_label_de || t?.title || "Unbekannt";
  };

  const toggleLive = async (session: CourseSession) => {
    const { error } = await supabase
      .from("course_sessions")
      .update({ is_live: !session.is_live })
      .eq("id", session.id);

    if (!error) {
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, is_live: !s.is_live } : s))
      );
    }
  };

  const handleCreate = async () => {
    if (!newTemplateId || !newDateIso) return;

    const { data, error } = await supabase
      .from("course_sessions")
      .insert({
        template_id: newTemplateId,
        date_iso: newDateIso,
        label_de: newLabelDe || null,
        instructor_name: newInstructor || null,
        max_seats: parseInt(newMaxSeats) || 5,
        address: newAddress || null,
        start_time: newStartTime || null,
        duration_minutes: parseInt(newDuration) || null,
      })
      .select()
      .single();

    if (!error && data) {
      setSessions((prev) => [...prev, data].sort((a, b) => a.date_iso.localeCompare(b.date_iso)));
      setShowCreateDialog(false);
      // Reset form
      setNewDateIso("");
      setNewLabelDe("");
      setNewInstructor("");
    }
  };

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
        <Button onClick={() => setShowCreateDialog(true)}>Neuen Termin erstellen</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Datum</TableHead>
            <TableHead>Kurs</TableHead>
            <TableHead>Dozent:in</TableHead>
            <TableHead>Plätze</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[120px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Noch keine Kurstermine erstellt.
              </TableCell>
            </TableRow>
          ) : (
            sessions.map((session) => (
              <TableRow key={session.id}>
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
                  <button onClick={() => toggleLive(session)}>
                    <Badge variant={session.is_live ? "default" : "secondary"}>
                      {session.is_live ? "Live" : "Entwurf"}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => deleteSession(session.id)}>
                    Löschen
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

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
                value={newTemplateId}
                onChange={(e) => setNewTemplateId(e.target.value)}
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
                <Input type="date" value={newDateIso} onChange={(e) => setNewDateIso(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Label (z.B. "15. Feb 2026")</Label>
                <Input value={newLabelDe} onChange={(e) => setNewLabelDe(e.target.value)} placeholder="15. Feb 2026" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Dozent:in</Label>
                <Input value={newInstructor} onChange={(e) => setNewInstructor(e.target.value)} placeholder="Dr. Sophia Wilk-Vollmann" />
              </div>
              <div className="space-y-1.5">
                <Label>Max. Plätze</Label>
                <Input type="number" value={newMaxSeats} onChange={(e) => setNewMaxSeats(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Adresse</Label>
              <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Startzeit</Label>
                <Input type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Dauer (Minuten)</Label>
                <Input type="number" value={newDuration} onChange={(e) => setNewDuration(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={!newTemplateId || !newDateIso}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
