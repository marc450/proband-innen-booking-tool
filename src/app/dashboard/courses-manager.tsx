"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Course, Slot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Plus, Trash2, Edit, Copy } from "lucide-react";

interface Props {
  initialCourses: Course[];
  initialSlots: Slot[];
}

export function CoursesManager({ initialCourses, initialSlots }: Props) {
  const [courses, setCourses] = useState(initialCourses);
  const [slots, setSlots] = useState(initialSlots);

  // Course dialog
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseDate, setCourseDate] = useState("");

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

  const supabase = createClient();

  const resetCourseForm = () => {
    setCourseTitle("");
    setCourseDescription("");
    setCourseDate("");
    setEditingCourse(null);
  };

  const handleSaveCourse = async () => {
    if (!courseTitle.trim()) return;

    const payload = {
      title: courseTitle,
      description: courseDescription || null,
      course_date: courseDate || null,
    };

    // Close and reset first so the dialog doesn't interfere with state updates
    setCourseDialogOpen(false);
    resetCourseForm();

    if (editingCourse) {
      const { data, error } = await supabase
        .from("courses")
        .update(payload)
        .eq("id", editingCourse.id)
        .select()
        .single();

      if (!error && data) {
        setCourses((prev) => prev.map((c) => (c.id === data.id ? data : c)));
      }
    } else {
      const { data, error } = await supabase
        .from("courses")
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        setCourses((prev) => [data, ...prev]);
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

  const buildStartTime = (date: string, time: string): string => {
    return new Date(`${date}T${time}:00`).toISOString();
  };

  const handleSaveSlot = async () => {
    if (!selectedCourseId || !slotTime) return;

    const course = courses.find((c) => c.id === selectedCourseId);
    if (!course?.course_date) return;

    const startTime = buildStartTime(course.course_date, slotTime);

    setSlotDialogOpen(false);
    setSlotTime("");
    setSlotCapacity("1");

    const { data, error } = await supabase
      .from("slots")
      .insert({
        course_id: selectedCourseId,
        start_time: startTime,
        end_time: null,
        capacity: parseInt(slotCapacity) || 1,
      })
      .select()
      .single();

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
        title: duplicatingCourse.title,
        description: duplicatingCourse.description,
        course_date: duplicateDate,
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

  return (
    <div className="space-y-8">
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

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kurse & Slots</h1>
        <Button onClick={() => setCourseDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Kurs
        </Button>
      </div>

      <Dialog open={courseDialogOpen} onOpenChange={(open) => {
        setCourseDialogOpen(open);
        if (!open) resetCourseForm();
      }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCourse ? "Kurs bearbeiten" : "Neuer Kurs"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="z.B. Botulinum Grundkurs"
                />
              </div>
              <div>
                <Label htmlFor="course_date">Datum des Kurses</Label>
                <Input
                  id="course_date"
                  type="date"
                  value={courseDate}
                  onChange={(e) => setCourseDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  placeholder="Kursbeschreibung (optional)"
                />
              </div>
              <Button onClick={handleSaveCourse} className="w-full">
                Speichern
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      {/* Duplicate Dialog */}
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

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Noch keine Kurse angelegt. Erstelle den ersten Kurs.
          </CardContent>
        </Card>
      ) : (
        courses.map((course) => {
          const courseSlots = slots
            .filter((s) => s.course_id === course.id)
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

          return (
            <Card key={course.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{course.title}</CardTitle>
                  {course.course_date && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(parseISO(course.course_date), "dd. MMMM yyyy", { locale: de })}
                    </p>
                  )}
                  {course.description && (
                    <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    title="Kurs duplizieren"
                    onClick={() => {
                      setDuplicatingCourse(course);
                      setDuplicateDialogOpen(true);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingCourse(course);
                      setCourseTitle(course.title);
                      setCourseDescription(course.description || "");
                      setCourseDate(course.course_date || "");
                      setCourseDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteCourseConfirm(course.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Slots</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectedCourseId(course.id); setSlotDialogOpen(true); }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Slot
                  </Button>

                  <Dialog
                    open={slotDialogOpen && selectedCourseId === course.id}
                    onOpenChange={(open) => {
                      setSlotDialogOpen(open);
                    }}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Neuer Slot</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        {!course.course_date && (
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
                            disabled={!course.course_date}
                          />
                          {course.course_date && (
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
                          disabled={!course.course_date || !slotTime}
                        >
                          Slot anlegen
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {courseSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Slots vorhanden</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Startzeit</TableHead>
                        <TableHead>Kapazität</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courseSlots.map((slot) => (
                        <TableRow key={slot.id}>
                          <TableCell>
                            {format(new Date(slot.start_time), "HH:mm")} Uhr
                          </TableCell>
                          <TableCell>{slot.capacity}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteSlotConfirm(slot.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
