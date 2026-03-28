"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Course, Slot, BookingStatus, CourseTemplate, DozentUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Plus, Trash2, Copy, ChevronDown, ChevronRight, Edit } from "lucide-react";

export interface SlotBooking {
  id: string;
  slot_id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  status: BookingStatus;
  patient_id: string | null;
}

interface Props {
  initialCourses: Course[];
  initialSlots: Slot[];
  initialBookings: SlotBooking[];
  templates: CourseTemplate[];
  dozentUsers: DozentUser[];
  isAdmin?: boolean;
}

function formatDozentName(d: DozentUser): string {
  return [d.title, d.first_name, d.last_name].filter(Boolean).join(" ");
}

export function CoursesManager({ initialCourses, initialSlots, initialBookings, templates, dozentUsers, isAdmin = true }: Props) {
  const [courses, setCourses] = useState(initialCourses);
  const [slots, setSlots] = useState(initialSlots);
  const [bookings] = useState(initialBookings);

  // Expanded courses
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  // New course dialog
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [courseDate, setCourseDate] = useState("");
  const [courseLocation, setCourseLocation] = useState("HY STUDIO, Rosa-Luxemburg-Straße 20, 10178 Berlin");
  const [slotStartTime, setSlotStartTime] = useState("10:00");
  const [slotInterval, setSlotInterval] = useState("30");
  const [slotCount, setSlotCount] = useState("5");
  const [slotCapacityNew, setSlotCapacityNew] = useState("1");
  const [selectedInstructor, setSelectedInstructor] = useState("");

  // Slot dialog
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [slotTime, setSlotTime] = useState("");
  const [slotCapacity, setSlotCapacity] = useState("1");

  // Duplicate dialog
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicatingCourse, setDuplicatingCourse] = useState<Course | null>(null);
  const [duplicateDate, setDuplicateDate] = useState("");

  // Confirm delete dialogs
  const [deleteCourseConfirm, setDeleteCourseConfirm] = useState<string | null>(null);
  const [deleteSlotConfirm, setDeleteSlotConfirm] = useState<string | null>(null);

  // Edit course dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editInstructor, setEditInstructor] = useState("");

  // Filters
  const [filterDozent, setFilterDozent] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterCourse, setFilterCourse] = useState("");

  const supabase = createClient();

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  const resetCourseForm = () => {
    setSelectedTemplateId("");
    setCourseDate("");
    setCourseLocation("HY STUDIO, Rosa-Luxemburg-Straße 20, 10178 Berlin");
    setSlotStartTime("10:00");
    setSlotInterval("30");
    setSlotCount("5");
    setSlotCapacityNew("1");
    setSelectedInstructor("");
  };

  const generateSlotTimes = (): string[] => {
    const count = parseInt(slotCount) || 0;
    const interval = parseInt(slotInterval) || 30;
    const [h, m] = slotStartTime.split(":").map(Number);
    const times: string[] = [];
    for (let i = 0; i < count; i++) {
      const totalMinutes = h * 60 + m + i * interval;
      const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
      const mm = String(totalMinutes % 60).padStart(2, "0");
      times.push(`${hh}:${mm}`);
    }
    return times;
  };

  const handleCreateCourse = async () => {
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template || !courseDate) return;

    const payload = {
      template_id: template.id,
      title: template.title,
      treatment_title: template.treatment_title || null,
      description: template.description,
      service_description: template.service_description,
      guide_price: template.guide_price,
      instructor: selectedInstructor || template.instructor || null,
      image_url: template.image_url,
      course_date: courseDate,
      location: courseLocation || null,
    };

    const slotTimes = generateSlotTimes();
    const cap = parseInt(slotCapacityNew) || 1;

    setCourseDialogOpen(false);
    resetCourseForm();

    const { data, error } = await supabase
      .from("courses")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return;
    }
    if (data) {
      setCourses((prev) => [data, ...prev]);

      // Auto-create slots
      if (slotTimes.length > 0) {
        const newSlots = slotTimes.map((time) => ({
          course_id: data.id,
          start_time: buildStartTime(courseDate, time),
          end_time: null,
          capacity: cap,
        }));

        const { data: insertedSlots, error: slotsError } = await supabase
          .from("slots")
          .insert(newSlots)
          .select();

        if (slotsError) {
          console.error("Slots insert error:", slotsError);
        }
        if (insertedSlots) {
          setSlots((prev) => [...prev, ...insertedSlots]);
        }
      }
    }
  };

  const handleDeleteCourse = async () => {
    if (!deleteCourseConfirm) return;
    const { error } = await supabase.from("courses").delete().eq("id", deleteCourseConfirm);
    if (!error) {
      setCourses(courses.filter((c) => c.id !== deleteCourseConfirm));
      setSlots(slots.filter((s) => s.course_id !== deleteCourseConfirm));
    }
    setDeleteCourseConfirm(null);
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setEditDate(course.course_date || "");
    setEditLocation(course.location || "");
    setEditInstructor(course.instructor || "");
    setEditDialogOpen(true);
  };

  const handleEditCourse = async () => {
    if (!editingCourse || !editDate || !editLocation.trim() || !editInstructor) {
      console.warn("Edit guard failed:", { editingCourse: !!editingCourse, editDate, editLocation, editInstructor });
      return;
    }
    const updates = { course_date: editDate, location: editLocation, instructor: editInstructor };
    const { data, error } = await supabase
      .from("courses")
      .update(updates)
      .eq("id", editingCourse.id)
      .select()
      .single();
    if (error) {
      console.error("Edit error:", error);
      alert(`Fehler beim Speichern: ${error.message}`);
      return;
    }
    if (data) {
      setCourses((prev) => prev.map((c) => c.id === data.id ? data : c));
    }
    setEditDialogOpen(false);
    setEditingCourse(null);
  };

  const buildStartTime = (date: string, time: string): string => {
    return new Date(`${date}T${time}:00`).toISOString();
  };

  const handleSaveSlot = async () => {
    if (!selectedCourseId || !slotTime) return;

    const course = courses.find((c) => c.id === selectedCourseId);
    if (!course?.course_date) return;

    const startTime = buildStartTime(course.course_date, slotTime);
    const cap = parseInt(slotCapacity) || 1;
    const courseId = selectedCourseId;

    setSlotDialogOpen(false);
    setSlotTime("");
    setSlotCapacity("1");

    const { data, error } = await supabase
      .from("slots")
      .insert({
        course_id: courseId,
        start_time: startTime,
        end_time: null,
        capacity: cap,
      })
      .select()
      .single();

    if (error) {
      console.error("Slot insert error:", error);
    }
    if (!error && data) {
      setSlots((prev) => [...prev, data]);
    }
  };

  const handleDeleteSlot = async () => {
    if (!deleteSlotConfirm) return;
    const { error } = await supabase.from("slots").delete().eq("id", deleteSlotConfirm);
    if (!error) {
      setSlots(slots.filter((s) => s.id !== deleteSlotConfirm));
    }
    setDeleteSlotConfirm(null);
  };

  const handleDuplicate = async () => {
    if (!duplicatingCourse || !duplicateDate) return;

    const { data: newCourse, error: courseError } = await supabase
      .from("courses")
      .insert({
        template_id: duplicatingCourse.template_id,
        title: duplicatingCourse.title,
        treatment_title: duplicatingCourse.treatment_title,
        description: duplicatingCourse.description,
        service_description: duplicatingCourse.service_description,
        guide_price: duplicatingCourse.guide_price,
        instructor: duplicatingCourse.instructor,
        image_url: duplicatingCourse.image_url,
        course_date: duplicateDate,
        location: duplicatingCourse.location,
      })
      .select()
      .single();

    if (courseError || !newCourse) return;

    setDuplicateDialogOpen(false);
    setDuplicatingCourse(null);
    setDuplicateDate("");
    setCourses((prev) => [newCourse, ...prev]);

    const originalSlots = slots.filter((s) => s.course_id === duplicatingCourse.id);
    const newSlots = originalSlots.map((s) => ({
      course_id: newCourse.id,
      start_time: buildStartTime(duplicateDate, format(new Date(s.start_time), "HH:mm")),
      end_time: null,
      capacity: s.capacity,
    }));

    if (newSlots.length > 0) {
      const { data: insertedSlots, error: slotsError } = await supabase
        .from("slots")
        .insert(newSlots)
        .select();

      if (!slotsError && insertedSlots) {
        setSlots((prev) => [...prev, ...insertedSlots]);
      }
    }
  };

  const getPatientName = (b: SlotBooking) => {
    if (b.first_name || b.last_name) {
      return `${b.first_name || ""} ${b.last_name || ""}`.trim();
    }
    return b.name || "Unbekannt";
  };

  return (
    <div className="space-y-4">
      {/* Edit course dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingCourse(null); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Kurs bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {editingCourse && (
              <p className="text-sm font-medium text-muted-foreground">{editingCourse.title}</p>
            )}
            <div>
              <Label>Kursleitende:r Ärzt:in *</Label>
              <Select value={editInstructor} onValueChange={(v) => setEditInstructor(v || "")}>
                <SelectTrigger className="mt-1 w-full">
                  <span className="flex flex-1 text-left line-clamp-1">
                    {editInstructor
                      ? editInstructor
                      : <span className="text-muted-foreground">Dozent:in auswählen...</span>
                    }
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {dozentUsers.map((d) => (
                    <SelectItem key={d.id} value={formatDozentName(d)}>
                      {formatDozentName(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit_date">Datum *</Label>
                <Input id="edit_date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit_location">Ort *</Label>
                <Input id="edit_location" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleEditCourse}
              disabled={!editDate || !editLocation.trim() || !editInstructor}
            >
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete course confirm */}
      <ConfirmDialog
        open={!!deleteCourseConfirm}
        title="Kurs löschen"
        description="Kurs wirklich löschen? Alle zugehörigen Slots und Buchungen werden ebenfalls gelöscht."
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleDeleteCourse}
        onCancel={() => setDeleteCourseConfirm(null)}
      />

      {/* Delete slot confirm */}
      <ConfirmDialog
        open={!!deleteSlotConfirm}
        title="Slot löschen"
        description="Slot wirklich löschen?"
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleDeleteSlot}
        onCancel={() => setDeleteSlotConfirm(null)}
      />

      {/* New course dialog — simplified: pick template + date */}
      <Dialog open={courseDialogOpen} onOpenChange={(open) => {
        setCourseDialogOpen(open);
        if (!open) resetCourseForm();
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Neuen Kurs anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {templates.length === 0 ? (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                Bitte erstelle zuerst eine Kursvorlage unter &quot;Kursvorlagen&quot;.
              </div>
            ) : (
              <>
                <div>
                  <Label>Kursvorlage *</Label>
                  <Select value={selectedTemplateId} onValueChange={(v) => setSelectedTemplateId(v || "")}>
                    <SelectTrigger className="mt-1 w-full">
                      <span className="flex flex-1 text-left line-clamp-1">
                        {selectedTemplateId
                          ? templates.find((t) => t.id === selectedTemplateId)?.title ?? "Vorlage auswählen..."
                          : <span className="text-muted-foreground">Vorlage auswählen...</span>
                        }
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>


                <div className="border-t" />

                <div>
                  <Label>Kursleitende:r Ärzt:in *</Label>
                  <Select value={selectedInstructor} onValueChange={(v) => setSelectedInstructor(v || "")}>
                    <SelectTrigger className="mt-1 w-full">
                      <span className="flex flex-1 text-left line-clamp-1">
                        {selectedInstructor && selectedInstructor !== "__none"
                          ? selectedInstructor
                          : <span className="text-muted-foreground">Dozent:in auswählen...</span>
                        }
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {dozentUsers.map((d) => (
                        <SelectItem key={d.id} value={formatDozentName(d)}>
                          {formatDozentName(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="new_course_date">Datum *</Label>
                    <Input
                      id="new_course_date"
                      type="date"
                      value={courseDate}
                      onChange={(e) => setCourseDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new_course_location">Ort *</Label>
                    <Input
                      id="new_course_location"
                      value={courseLocation}
                      onChange={(e) => setCourseLocation(e.target.value)}
                      placeholder="z.B. HY STUDIO, Rosa-Luxemburg-Straße 20, 10178 Berlin"
                    />
                  </div>
                </div>

                <div className="border-t" />

                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Zeitfenster</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="slot_start">Startzeit *</Label>
                    <Input
                      id="slot_start"
                      type="time"
                      value={slotStartTime}
                      onChange={(e) => setSlotStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="slot_interval">Intervall (Min.)</Label>
                    <Input
                      id="slot_interval"
                      type="number"
                      min="5"
                      value={slotInterval}
                      onChange={(e) => setSlotInterval(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="slot_count">Anzahl Slots</Label>
                    <Input
                      id="slot_count"
                      type="number"
                      min="1"
                      value={slotCount}
                      onChange={(e) => setSlotCount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="slot_cap">Kapazität pro Slot</Label>
                    <Input
                      id="slot_cap"
                      type="number"
                      min="1"
                      value={slotCapacityNew}
                      onChange={(e) => setSlotCapacityNew(e.target.value)}
                    />
                  </div>
                </div>

                {/* Slot preview */}
                {slotStartTime && parseInt(slotCount) > 0 && (
                  <div className="bg-muted/50 rounded-md p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Vorschau ({generateSlotTimes().length} Slots)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {generateSlotTimes().map((time) => (
                        <span key={time} className="text-sm bg-white border rounded px-2 py-0.5">
                          {time} Uhr
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleCreateCourse}
                  className="w-full"
                  disabled={!selectedTemplateId || !selectedInstructor || !courseDate || !courseLocation.trim() || !slotStartTime || parseInt(slotCount) < 1}
                >
                  Kurs anlegen
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={(open) => {
        setDuplicateDialogOpen(open);
        if (!open) { setDuplicatingCourse(null); setDuplicateDate(""); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kurs duplizieren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Kopiert <strong>{duplicatingCourse?.title}</strong> mit allen Slots auf ein neues Datum.
            </p>
            <div>
              <Label htmlFor="dup_date">Neues Datum</Label>
              <Input
                id="dup_date"
                type="date"
                value={duplicateDate}
                onChange={(e) => setDuplicateDate(e.target.value)}
              />
            </div>
            <Button onClick={handleDuplicate} className="w-full" disabled={!duplicateDate}>
              Duplizieren
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Slot dialog */}
      <Dialog
        open={slotDialogOpen}
        onOpenChange={(open) => setSlotDialogOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuer Slot</DialogTitle>
          </DialogHeader>
          {(() => {
            const course = courses.find((c) => c.id === selectedCourseId);
            return (
              <div className="space-y-4 pt-4">
                {!course?.course_date && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    Bitte zuerst ein Datum für diesen Kurs festlegen.
                  </p>
                )}
                <div>
                  <Label htmlFor="slot_time">Startzeit</Label>
                  <Input
                    id="slot_time"
                    type="time"
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                    disabled={!course?.course_date}
                  />
                  {course?.course_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      am {format(parseISO(course.course_date), "dd.MM.yyyy", { locale: de })}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="capacity">Kapazität</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={slotCapacity}
                    onChange={(e) => setSlotCapacity(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleSaveSlot}
                  className="w-full"
                  disabled={!course?.course_date || !slotTime}
                >
                  Slot anlegen
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kurse & Slots</h1>
        {isAdmin && (
          <Button onClick={() => setCourseDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Kurs
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={filterCourse || "__all"} onValueChange={(v) => setFilterCourse(v === "__all" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-52 h-10 text-sm bg-white border border-gray-200 rounded-[10px] px-3">
            <span className="flex flex-1 text-left line-clamp-1">
              {filterCourse
                ? filterCourse
                : <span className="text-muted-foreground">Alle Kurstypen</span>
              }
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Alle Kurstypen</SelectItem>
            {Array.from(new Set(courses.map((c) => c.title).filter((t): t is string => !!t))).sort().map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDozent || "__all"} onValueChange={(v) => setFilterDozent(v === "__all" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-52 h-10 text-sm bg-white border border-gray-200 rounded-[10px] px-3">
            <span className="flex flex-1 text-left line-clamp-1">
              {filterDozent
                ? filterDozent
                : <span className="text-muted-foreground">Alle Dozent:innen</span>
              }
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Alle Dozent:innen</SelectItem>
            {Array.from(new Set(courses.map((c) => c.instructor).filter((i): i is string => !!i))).sort().map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="w-44 h-10 text-sm bg-white border border-gray-200 rounded-[10px] px-3"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
        {(filterCourse || filterDozent || filterDate) && (
          <Button variant="ghost" size="sm" className="h-10 text-sm" onClick={() => { setFilterCourse(""); setFilterDozent(""); setFilterDate(""); }}>
            Zurücksetzen
          </Button>
        )}
      </div>

      {/* Course list */}
      {(() => {
        const filteredCourses = courses.filter((c) => {
          if (filterCourse && c.title !== filterCourse) return false;
          if (filterDozent && c.instructor !== filterDozent) return false;
          if (filterDate && c.course_date !== filterDate) return false;
          return true;
        });
        if (filteredCourses.length === 0) return (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {courses.length === 0 ? "Noch keine Kurse angelegt. Erstelle den ersten Kurs." : "Keine Kurse entsprechen den Filterkriterien."}
            </CardContent>
          </Card>
        );
        return (
        <div className="space-y-2">
        {filteredCourses.map((course) => {
          const courseSlots = slots
            .filter((s) => s.course_id === course.id)
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

          const totalCapacity = courseSlots.reduce((sum, s) => sum + s.capacity, 0);
          const bookedCount = courseSlots.reduce((sum, s) => {
            return sum + bookings.filter((b) => b.slot_id === s.id).length;
          }, 0);

          const isExpanded = expandedCourses.has(course.id);

          return (
            <Card key={course.id} className="overflow-hidden shadow-none">
              {/* Course header row */}
              <div className="flex items-center gap-2 px-4 py-1.5">
                <button
                  onClick={() => toggleCourse(course.id)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-expanded={isExpanded}
                >
                  {isExpanded
                    ? <ChevronDown className="h-4 w-4" />
                    : <ChevronRight className="h-4 w-4" />
                  }
                </button>

                <button
                  onClick={() => toggleCourse(course.id)}
                  className="flex items-center gap-4 flex-1 min-w-0 text-left"
                >
                  <span className="[flex:3_1_0%] font-semibold text-base truncate min-w-0">{course.title}</span>
                  <span className="[flex:2_1_0%] text-sm text-muted-foreground truncate">
                    {course.instructor || <span className="italic opacity-50">Kein:e Dozent:in</span>}
                  </span>
                  <span className="[flex:2_1_0%] text-sm text-muted-foreground truncate">
                    {course.course_date
                      ? format(parseISO(course.course_date), "dd. MMMM yyyy", { locale: de })
                      : <span className="italic">Kein Datum</span>}
                  </span>
                  <span className={`[flex:1_1_0%] text-sm font-semibold text-center whitespace-nowrap ${bookedCount === totalCapacity && totalCapacity > 0 ? "text-green-600" : "text-red-500"}`}>
                    {bookedCount}/{totalCapacity}
                  </span>
                </button>

                {isAdmin && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" title="Kurs bearbeiten"
                      onClick={(e) => { e.stopPropagation(); openEditCourse(course); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Kurs duplizieren"
                      onClick={(e) => { e.stopPropagation(); setDuplicatingCourse(course); setDuplicateDialogOpen(true); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm"
                      onClick={(e) => { e.stopPropagation(); setDeleteCourseConfirm(course.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <CardContent className="pt-0 pb-4 px-4 border-t">
                  <div className="flex items-center justify-between mb-3 mt-3">
                    <span className="text-sm font-medium text-muted-foreground">Slots</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        setSlotTime("");
                        setSlotCapacity("1");
                        setSlotDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Slot
                    </Button>
                  </div>

                  {courseSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">Keine Slots vorhanden</p>
                  ) : (
                    <div>
                      {/* Column header */}
                      <div className="flex items-center gap-4 px-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <span className="w-28 shrink-0">Zeit</span>
                        <span className="w-24 shrink-0">Status</span>
                        <span className="flex-1 min-w-0">Proband:in</span>
                        <span className="w-24 text-center shrink-0">Kapazität</span>
                        <span className="w-24 text-center shrink-0">Besetzung</span>
                        <span className="w-8 shrink-0" />
                      </div>

                      <div className="space-y-1">
                        {courseSlots.map((slot) => {
                          const slotBookings = bookings.filter((b) => b.slot_id === slot.id);
                          const slotBooked = slotBookings.length;

                          return (
                            <div
                              key={slot.id}
                              className="flex items-center gap-4 py-2 px-2 rounded-md bg-muted/40"
                            >
                              <span className="w-28 shrink-0 text-sm font-medium">
                                {format(new Date(slot.start_time), "HH:mm")} Uhr
                              </span>

                              <div className="w-24 shrink-0">
                                {slotBooked > 0
                                  ? <Badge variant="default" className="text-xs">Gebucht</Badge>
                                  : <span className="text-sm text-muted-foreground">Frei</span>
                                }
                              </div>

                              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                {slotBookings.length > 0 ? slotBookings.map((b) => (
                                  b.patient_id ? (
                                    <Link
                                      key={b.id}
                                      href={`/dashboard/patients/${b.patient_id}`}
                                      className="text-sm font-medium hover:underline truncate"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {getPatientName(b)}
                                    </Link>
                                  ) : (
                                    <span key={b.id} className="text-sm truncate">{getPatientName(b)}</span>
                                  )
                                )) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </div>

                              <span className="w-24 shrink-0 text-sm text-muted-foreground text-center">
                                {slot.capacity}
                              </span>

                              <span className={`w-24 shrink-0 text-sm font-semibold text-center ${slotBooked === slot.capacity ? "text-green-600" : "text-red-500"}`}>
                                {slotBooked}/{slot.capacity}
                              </span>

                              {isAdmin && (
                                <Button variant="ghost" size="sm" className="w-8 shrink-0 p-0" onClick={() => setDeleteSlotConfirm(slot.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
        </div>
        );
      })()}
    </div>
  );
}
