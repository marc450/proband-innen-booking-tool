"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Course, Slot, BookingStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Plus, Trash2, Edit, Copy, ChevronDown, ChevronRight, ImageIcon, Upload } from "lucide-react";

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
}

export function CoursesManager({ initialCourses, initialSlots, initialBookings }: Props) {
  const [courses, setCourses] = useState(initialCourses);
  const [slots, setSlots] = useState(initialSlots);
  const [bookings] = useState(initialBookings);

  // Expanded courses (all collapsed by default)
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  // Course dialog
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseDate, setCourseDate] = useState("");
  const [courseLocation, setCourseLocation] = useState("");
  const [courseInstructor, setCourseInstructor] = useState("");
  const [courseGuidePrice, setCourseGuidePrice] = useState("");
  const [courseServiceDescription, setCourseServiceDescription] = useState("");
  const [courseImageUrl, setCourseImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  const resetCourseForm = () => {
    setCourseTitle("");
    setCourseDescription("");
    setCourseDate("");
    setCourseLocation("");
    setCourseInstructor("");
    setCourseGuidePrice("");
    setCourseServiceDescription("");
    setCourseImageUrl("");
    setEditingCourse(null);
  };

  const uploadImage = async (file: File) => {
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `course-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("course-images")
        .upload(fileName, file, { upsert: true });
      if (!error) {
        const { data: urlData } = supabase.storage
          .from("course-images")
          .getPublicUrl(fileName);
        setCourseImageUrl(urlData.publicUrl);
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImage(file);
    e.target.value = "";
  };

  const handleImageDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await uploadImage(file);
    }
  };

  const handleSaveCourse = async () => {
    if (!courseTitle.trim()) return;

    const isEditing = !!editingCourse;
    const editId = editingCourse?.id;
    const payload = {
      title: courseTitle,
      description: courseDescription || null,
      course_date: courseDate || null,
      location: courseLocation || null,
      instructor: courseInstructor || null,
      guide_price: courseGuidePrice || null,
      service_description: courseServiceDescription || null,
      image_url: courseImageUrl || null,
    };

    setCourseDialogOpen(false);
    resetCourseForm();

    if (isEditing && editId) {
      const { data, error } = await supabase
        .from("courses")
        .update(payload)
        .eq("id", editId)
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

      if (error) {
        console.error("Insert error:", error);
      }
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

  const getPatientName = (b: SlotBooking) => {
    if (b.first_name || b.last_name) {
      return `${b.first_name || ""} ${b.last_name || ""}`.trim();
    }
    return b.name || "Unbekannt";
  };

  return (
    <div className="space-y-4">
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

      {/* Course dialog */}
      <Dialog open={courseDialogOpen} onOpenChange={(open) => {
        setCourseDialogOpen(open);
        if (!open) resetCourseForm();
      }}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Kurs bearbeiten" : "Neuer Kurs"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">

            {/* Section: Grunddaten */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Grunddaten</h3>
              <div>
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="z.B. Botulinum Grundkurs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="course_date">Datum</Label>
                  <Input
                    id="course_date"
                    type="date"
                    value={courseDate}
                    onChange={(e) => setCourseDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="instructor">Kursleitende:r Ärzt:in</Label>
                  <Input
                    id="instructor"
                    value={courseInstructor}
                    onChange={(e) => setCourseInstructor(e.target.value)}
                    placeholder="z.B. Dr. med. Anna Müller"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Adresse / Ort</Label>
                <Input
                  id="location"
                  value={courseLocation}
                  onChange={(e) => setCourseLocation(e.target.value)}
                  placeholder="z.B. Rosa-Luxemburg-Straße 20, 10178 Berlin"
                />
              </div>
            </div>

            <div className="border-t" />

            {/* Section: Leistung & Preis */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Leistung &amp; Preis</h3>
              <div>
                <Label htmlFor="service_description">Leistungsbeschreibung</Label>
                <Textarea
                  id="service_description"
                  value={courseServiceDescription}
                  onChange={(e) => setCourseServiceDescription(e.target.value)}
                  placeholder="z.B. Behandlung mimischer Falten in bis zu 3 Zonen des Gesichts."
                />
              </div>
              <div>
                <Label htmlFor="guide_price">Richtpreis</Label>
                <Input
                  id="guide_price"
                  value={courseGuidePrice}
                  onChange={(e) => setCourseGuidePrice(e.target.value)}
                  placeholder="z.B. 99€"
                />
              </div>
            </div>

            <div className="border-t" />

            {/* Section: Beschreibung & Bild */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Beschreibung &amp; Bild</h3>
              <div>
                <Label htmlFor="description">Kursbeschreibung</Label>
                <Textarea
                  id="description"
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  placeholder="Beschreibung, die Proband:innen auf der Buchungsseite sehen"
                  rows={4}
                />
              </div>
              <div>
                <Label>Kursbild</Label>
                {courseImageUrl ? (
                  <div className="mt-1 relative">
                    <img
                      src={courseImageUrl}
                      alt="Kursbild"
                      className="w-full aspect-video object-cover rounded-md border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setCourseImageUrl("")}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Entfernen
                    </Button>
                  </div>
                ) : (
                  <label
                    className="mt-1 flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-md cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={handleImageDrop}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    {uploadingImage ? (
                      <span className="text-sm text-muted-foreground">Wird hochgeladen...</span>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                        <span className="text-sm text-muted-foreground">Bild hochladen</span>
                        <span className="text-xs text-muted-foreground">JPG, PNG, WebP</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>

            <Button onClick={handleSaveCourse} className="w-full" disabled={!courseTitle.trim()}>
              Speichern
            </Button>
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
        <Button onClick={() => setCourseDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Kurs
        </Button>
      </div>

      {/* Course list */}
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

          const totalCapacity = courseSlots.reduce((sum, s) => sum + s.capacity, 0);
          const bookedCount = courseSlots.reduce((sum, s) => {
            return sum + bookings.filter((b) => b.slot_id === s.id).length;
          }, 0);
          const remainingCapacity = totalCapacity - bookedCount;

          const isExpanded = expandedCourses.has(course.id);

          return (
            <Card key={course.id} className="overflow-hidden">
              {/* Collapsed header — always visible */}
              {/* Course header row — same skeleton as slot rows below */}
              <div className="flex items-center gap-2 px-4 py-3">
                {/* Chevron toggle */}
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

                {/* Shared 4-column content area */}
                <button
                  onClick={() => toggleCourse(course.id)}
                  className="flex items-center gap-4 flex-1 min-w-0 text-left"
                >
                  <span className="[flex:3_1_0%] font-semibold text-base truncate min-w-0">{course.title}</span>
                  <span className="[flex:2_1_0%] text-sm text-muted-foreground truncate">
                    {course.course_date
                      ? format(parseISO(course.course_date), "dd. MMMM yyyy", { locale: de })
                      : <span className="italic">Kein Datum</span>}
                  </span>
                  <span className="[flex:1_1_0%] text-sm text-muted-foreground text-center whitespace-nowrap">
                    {courseSlots.length} {courseSlots.length === 1 ? "Slot" : "Slots"}
                  </span>
                  <span className={`[flex:1_1_0%] text-sm font-semibold text-right whitespace-nowrap ${bookedCount === totalCapacity && totalCapacity > 0 ? "text-green-600" : "text-red-500"}`}>
                    {bookedCount}/{totalCapacity}
                  </span>
                </button>

                {/* Action buttons — fixed width, slots rows will mirror this */}
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" title="Kurs duplizieren"
                    onClick={(e) => { e.stopPropagation(); setDuplicatingCourse(course); setDuplicateDialogOpen(true); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm"
                    onClick={(e) => { e.stopPropagation(); setEditingCourse(course); setCourseTitle(course.title); setCourseDescription(course.description || ""); setCourseDate(course.course_date || ""); setCourseLocation(course.location || ""); setCourseInstructor(course.instructor || ""); setCourseGuidePrice(course.guide_price || ""); setCourseServiceDescription(course.service_description || ""); setCourseImageUrl(course.image_url || ""); setCourseDialogOpen(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm"
                    onClick={(e) => { e.stopPropagation(); setDeleteCourseConfirm(course.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <CardContent className="pt-0 pb-4 px-4 border-t">
                  {course.description && (
                    <p className="text-sm text-muted-foreground mt-3 mb-4">{course.description}</p>
                  )}

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
                              {/* Zeit */}
                              <span className="w-28 shrink-0 text-sm font-medium">
                                {format(new Date(slot.start_time), "HH:mm")} Uhr
                              </span>

                              {/* Status */}
                              <div className="w-24 shrink-0">
                                {slotBooked > 0
                                  ? <Badge variant="default" className="text-xs">Gebucht</Badge>
                                  : <span className="text-sm text-muted-foreground">Frei</span>
                                }
                              </div>

                              {/* Proband:in */}
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

                              {/* Kapazität */}
                              <span className="w-24 shrink-0 text-sm text-muted-foreground text-center">
                                {slot.capacity}
                              </span>

                              {/* Besetzung */}
                              <span className={`w-24 shrink-0 text-sm font-semibold text-center ${slotBooked === slot.capacity ? "text-green-600" : "text-red-500"}`}>
                                {slotBooked}/{slot.capacity}
                              </span>

                              {/* Delete */}
                              <Button variant="ghost" size="sm" className="w-8 shrink-0 p-0" onClick={() => setDeleteSlotConfirm(slot.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
        })
      )}
    </div>
  );
}
