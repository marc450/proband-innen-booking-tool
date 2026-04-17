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
  DialogFooter,
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
import { Plus, Trash2, Copy, ChevronDown, ChevronRight, Edit, Upload, Ban, CheckCircle2 } from "lucide-react";

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
  type SlotRow = { time: string; capacity: string };
  const emptySlotRow = (): SlotRow => ({ time: "", capacity: "1" });
  const [slotRows, setSlotRows] = useState<SlotRow[]>([emptySlotRow()]);
  const [selectedInstructor, setSelectedInstructor] = useState("");
  // Optional image override. Empty string means "use the template's image".
  const [courseImageUrl, setCourseImageUrl] = useState("");
  const [uploadingCourseImage, setUploadingCourseImage] = useState(false);
  const [courseImageError, setCourseImageError] = useState<string | null>(null);
  const [isDraggingCourseImage, setIsDraggingCourseImage] = useState(false);

  // Slot dialog
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [slotTime, setSlotTime] = useState("");
  const [slotCapacity, setSlotCapacity] = useState("1");
  // When set, the slot dialog is in edit mode and writes to this slot
  // instead of inserting a new row.
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  // Duplicate dialog
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicatingCourse, setDuplicatingCourse] = useState<Course | null>(null);
  const [duplicateTemplateId, setDuplicateTemplateId] = useState("");
  const [duplicateDate, setDuplicateDate] = useState("");
  const [duplicateInstructor, setDuplicateInstructor] = useState("");
  const [duplicateLocation, setDuplicateLocation] = useState("");

  // Confirm delete dialogs
  const [deleteCourseConfirm, setDeleteCourseConfirm] = useState<string | null>(null);
  const [deleteSlotConfirm, setDeleteSlotConfirm] = useState<string | null>(null);

  // Block slot dialog
  const [blockSlotId, setBlockSlotId] = useState<string | null>(null);
  const [blockNote, setBlockNote] = useState("");

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
    setSlotRows([emptySlotRow()]);
    setSelectedInstructor("");
    setCourseImageUrl("");
    setCourseImageError(null);
    setIsDraggingCourseImage(false);
  };

  // Resize a chosen image down to max 1200px wide and re-encode as WebP
  // before uploading. Mirrors the helper in templates-manager.tsx so course
  // image overrides land in the same shape as template images.
  const resizeImage = (file: File, maxWidth = 1200): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Blob failed"))),
          "image/webp",
          0.82
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadCourseImage = async (file: File) => {
    setUploadingCourseImage(true);
    setCourseImageError(null);
    try {
      const resized = await resizeImage(file);
      const fileName = `course-${Date.now()}.webp`;
      const { error } = await supabase.storage
        .from("course-images")
        .upload(fileName, resized, { upsert: true, contentType: "image/webp" });
      if (error) {
        setCourseImageError(error.message || "Upload fehlgeschlagen");
        return;
      }
      const { data: urlData } = supabase.storage
        .from("course-images")
        .getPublicUrl(fileName);
      setCourseImageUrl(urlData.publicUrl);
    } catch {
      setCourseImageError("Upload fehlgeschlagen");
    } finally {
      setUploadingCourseImage(false);
    }
  };

  const handleCourseImageInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadCourseImage(file);
    e.target.value = "";
  };

  const handleCourseImageDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCourseImage(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await uploadCourseImage(file);
    }
  };

  const updateSlotRow = (index: number, patch: Partial<SlotRow>) => {
    setSlotRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addSlotRow = () => {
    setSlotRows((prev) => [...prev, emptySlotRow()]);
  };

  const removeSlotRow = (index: number) => {
    setSlotRows((prev) => (prev.length === 1 ? [emptySlotRow()] : prev.filter((_, i) => i !== index)));
  };

  const validSlotRows = (): SlotRow[] =>
    slotRows.filter((row) => /^\d{2}:\d{2}$/.test(row.time) && (parseInt(row.capacity) || 0) >= 1);

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
      image_url: courseImageUrl || template.image_url,
      course_date: courseDate,
      location: courseLocation || null,
    };

    const rows = validSlotRows();

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

      // Create slots from manually entered rows
      if (rows.length > 0) {
        const newSlots = rows.map((row) => ({
          course_id: data.id,
          start_time: buildStartTime(courseDate, row.time),
          end_time: null,
          capacity: parseInt(row.capacity) || 1,
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
    if (!selectedCourseId || !slotTime) {
      console.warn("handleSaveSlot: missing selectedCourseId or slotTime", {
        selectedCourseId,
        slotTime,
      });
      return;
    }

    const course = courses.find((c) => c.id === selectedCourseId);
    if (!course?.course_date) {
      console.warn("handleSaveSlot: course has no course_date set", {
        courseId: selectedCourseId,
      });
      return;
    }

    const startTime = buildStartTime(course.course_date, slotTime);
    const cap = parseInt(slotCapacity) || 1;
    const slotIdBeingEdited = editingSlotId;

    setSlotDialogOpen(false);
    setSlotTime("");
    setSlotCapacity("1");
    setEditingSlotId(null);

    if (slotIdBeingEdited) {
      // Edit existing slot
      const { data, error } = await supabase
        .from("slots")
        .update({ start_time: startTime, capacity: cap })
        .eq("id", slotIdBeingEdited)
        .select()
        .single();
      if (error) {
        console.error("Slot update error:", error);
        return;
      }
      if (data) {
        setSlots((prev) => prev.map((s) => (s.id === slotIdBeingEdited ? data : s)));
      }
      return;
    }

    // Create new slot
    const { data, error } = await supabase
      .from("slots")
      .insert({
        course_id: selectedCourseId,
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

  const handleBlockSlot = async () => {
    if (!blockSlotId) return;
    const { error } = await supabase
      .from("slots")
      .update({ blocked: true, blocked_note: blockNote || null })
      .eq("id", blockSlotId);
    if (!error) {
      setSlots((prev) =>
        prev.map((s) => (s.id === blockSlotId ? { ...s, blocked: true, blocked_note: blockNote || null } : s))
      );
    }
    setBlockSlotId(null);
    setBlockNote("");
  };

  const handleUnblockSlot = async (slotId: string) => {
    const { error } = await supabase
      .from("slots")
      .update({ blocked: false, blocked_note: null })
      .eq("id", slotId);
    if (!error) {
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, blocked: false, blocked_note: null } : s))
      );
    }
  };

  const openDuplicate = (course: Course) => {
    setDuplicatingCourse(course);
    setDuplicateTemplateId(course.template_id || "");
    setDuplicateDate("");
    setDuplicateInstructor(course.instructor || "");
    setDuplicateLocation(course.location || "");
    setDuplicateDialogOpen(true);
  };

  const resetDuplicateForm = () => {
    setDuplicatingCourse(null);
    setDuplicateTemplateId("");
    setDuplicateDate("");
    setDuplicateInstructor("");
    setDuplicateLocation("");
  };

  const handleDuplicate = async () => {
    if (!duplicatingCourse || !duplicateTemplateId || !duplicateDate || !duplicateInstructor || !duplicateLocation.trim()) return;

    const template = templates.find((t) => t.id === duplicateTemplateId);
    if (!template) return;

    const { data: newCourse, error: courseError } = await supabase
      .from("courses")
      .insert({
        template_id: template.id,
        title: template.title,
        treatment_title: template.treatment_title || null,
        description: template.description,
        service_description: template.service_description,
        guide_price: template.guide_price,
        instructor: duplicateInstructor,
        image_url: template.image_url,
        course_date: duplicateDate,
        location: duplicateLocation,
      })
      .select()
      .single();

    if (courseError || !newCourse) return;

    setDuplicateDialogOpen(false);
    resetDuplicateForm();
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
        <DialogContent size="wide">
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

      {/* Block slot dialog */}
      <Dialog open={!!blockSlotId} onOpenChange={(open) => { if (!open) { setBlockSlotId(null); setBlockNote(""); } }}>
        <DialogContent className="bg-card sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Slot sperren</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="block-note">Notiz (optional)</Label>
            <Input
              id="block-note"
              placeholder="z.B. Bereits extern gebucht"
              value={blockNote}
              onChange={(e) => setBlockNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleBlockSlot(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBlockSlotId(null); setBlockNote(""); }}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleBlockSlot}>Sperren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New course dialog */}
      <Dialog open={courseDialogOpen} onOpenChange={(open) => {
        setCourseDialogOpen(open);
        if (!open) resetCourseForm();
      }}>
        <DialogContent size="wide" className="bg-card sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Neuen Kurs anlegen</DialogTitle>
          </DialogHeader>

          {templates.length === 0 ? (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              Bitte erstelle zuerst eine Kursvorlage unter &quot;Kursvorlagen&quot;.
            </div>
          ) : (
            <>
              <div className="space-y-5 py-1">
                {/* Kursdaten */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Kursvorlage *</Label>
                    <Select value={selectedTemplateId} onValueChange={(v) => setSelectedTemplateId(v || "")}>
                      <SelectTrigger className="h-10 w-full">
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

                  <div className="space-y-1.5">
                    <Label>Kursleitende:r Ärzt:in *</Label>
                    <Select value={selectedInstructor} onValueChange={(v) => setSelectedInstructor(v || "")}>
                      <SelectTrigger className="h-10 w-full">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="new_course_date">Datum *</Label>
                      <Input
                        id="new_course_date"
                        type="date"
                        className="h-10"
                        value={courseDate}
                        onChange={(e) => setCourseDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new_course_location">Ort *</Label>
                      <Input
                        id="new_course_location"
                        className="h-10"
                        value={courseLocation}
                        onChange={(e) => setCourseLocation(e.target.value)}
                        placeholder="z.B. HY STUDIO, Rosa-Luxemburg-Straße 20, 10178 Berlin"
                      />
                    </div>
                  </div>

                  {/* Optional image override. Falls back to the template's
                      image when left empty. */}
                  {(() => {
                    const tpl = templates.find((t) => t.id === selectedTemplateId);
                    const previewUrl = courseImageUrl || tpl?.image_url || "";
                    const usingOverride = Boolean(courseImageUrl);
                    return (
                      <div className="space-y-1.5">
                        <Label>Kursbild</Label>
                        <p className="text-xs text-muted-foreground">
                          Optional. Standardmäßig wird das Bild der gewählten Kursvorlage verwendet.
                        </p>
                        {previewUrl ? (
                          <div className="space-y-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={previewUrl}
                              alt="Kursbild Vorschau"
                              className="w-full aspect-video object-cover rounded-md"
                            />
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">
                                {usingOverride ? "Eigenes Bild für diesen Kurs" : "Bild aus der Kursvorlage"}
                              </span>
                              <div className="flex items-center gap-2">
                                {usingOverride && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCourseImageUrl("")}
                                  >
                                    Auf Vorlage zurücksetzen
                                  </Button>
                                )}
                                <label className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer">
                                  <Upload className="h-3.5 w-3.5" />
                                  {usingOverride ? "Bild ersetzen" : "Eigenes Bild hochladen"}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleCourseImageInput}
                                    disabled={uploadingCourseImage}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <label
                            className={`flex flex-col items-center justify-center h-28 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
                              isDraggingCourseImage
                                ? "border-primary bg-primary/10"
                                : "hover:border-primary/50 hover:bg-muted/50"
                            }`}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingCourseImage(true); }}
                            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingCourseImage(true); }}
                            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingCourseImage(false); }}
                            onDrop={handleCourseImageDrop}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleCourseImageInput}
                              disabled={uploadingCourseImage}
                            />
                            {uploadingCourseImage ? (
                              <div className="flex flex-col items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span className="text-xs text-muted-foreground">Wird hochgeladen...</span>
                              </div>
                            ) : (
                              <>
                                <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                                <span className="text-xs text-muted-foreground">Bild hochladen oder hierher ziehen</span>
                              </>
                            )}
                          </label>
                        )}
                        {courseImageError && (
                          <p className="text-xs text-red-600">{courseImageError}</p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Zeitfenster */}
                <div className="space-y-2">
                  <Label>Zeitfenster *</Label>
                  <p className="text-xs text-muted-foreground">
                    Gib jedes Zeitfenster mit seiner Startzeit ein. Du kannst bequem aus Deiner Excel-Planung kopieren.
                  </p>

                  <div className="rounded-lg bg-muted/40 p-3 space-y-2 mt-2">
                    <div className="grid grid-cols-[1fr_110px_36px] gap-2 px-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Startzeit</span>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Plätze</span>
                      <span />
                    </div>
                    {slotRows.map((row, i) => (
                      <div key={i} className="grid grid-cols-[1fr_110px_36px] gap-2 items-center">
                        <Input
                          type="time"
                          className="h-10 bg-card"
                          value={row.time}
                          onChange={(e) => updateSlotRow(i, { time: e.target.value })}
                        />
                        <Input
                          type="number"
                          min="1"
                          className="h-10 bg-card"
                          value={row.capacity}
                          onChange={(e) => updateSlotRow(i, { capacity: e.target.value })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeSlotRow(i)}
                          aria-label="Zeitfenster entfernen"
                          className="text-muted-foreground hover:text-destructive justify-self-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addSlotRow}
                      className="w-full mt-1 text-primary hover:text-primary"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Zeitfenster hinzufügen
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setCourseDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button
                  onClick={handleCreateCourse}
                  disabled={!selectedTemplateId || !selectedInstructor || !courseDate || !courseLocation.trim() || validSlotRows().length < 1}
                >
                  Kurs anlegen
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Duplicate dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={(open) => {
        setDuplicateDialogOpen(open);
        if (!open) resetDuplicateForm();
      }}>
        <DialogContent className="bg-card sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Kurs duplizieren</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              Kopiert <strong>{duplicatingCourse?.title}</strong> mit allen Zeitfenstern. Du kannst Kurstyp, Datum, Dozent:in und Ort vor dem Duplizieren anpassen.
            </p>

            <div className="space-y-1.5">
              <Label>Kursvorlage *</Label>
              <Select value={duplicateTemplateId} onValueChange={(v) => setDuplicateTemplateId(v || "")}>
                <SelectTrigger className="h-10 w-full">
                  <span className="flex flex-1 text-left line-clamp-1">
                    {duplicateTemplateId
                      ? templates.find((t) => t.id === duplicateTemplateId)?.title ?? "Vorlage auswählen..."
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

            <div className="space-y-1.5">
              <Label htmlFor="dup_date">Neues Datum *</Label>
              <Input
                id="dup_date"
                type="date"
                className="h-10"
                value={duplicateDate}
                onChange={(e) => setDuplicateDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Kursleitende:r Ärzt:in *</Label>
              <Select value={duplicateInstructor} onValueChange={(v) => setDuplicateInstructor(v || "")}>
                <SelectTrigger className="h-10 w-full">
                  <span className="flex flex-1 text-left line-clamp-1">
                    {duplicateInstructor
                      ? duplicateInstructor
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

            <div className="space-y-1.5">
              <Label htmlFor="dup_location">Ort *</Label>
              <Input
                id="dup_location"
                className="h-10"
                value={duplicateLocation}
                onChange={(e) => setDuplicateLocation(e.target.value)}
                placeholder="z.B. HY STUDIO, Rosa-Luxemburg-Straße 20, 10178 Berlin"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDuplicateDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={!duplicateTemplateId || !duplicateDate || !duplicateInstructor || !duplicateLocation.trim()}
            >
              Duplizieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slot dialog */}
      <Dialog
        open={slotDialogOpen}
        onOpenChange={(open) => {
          setSlotDialogOpen(open);
          if (!open) {
            setEditingSlotId(null);
            setSlotTime("");
            setSlotCapacity("1");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSlotId ? "Slot bearbeiten" : "Neuer Slot"}</DialogTitle>
          </DialogHeader>
          {(() => {
            const course = courses.find((c) => c.id === selectedCourseId);
            const missingCourseDate = !course?.course_date;
            const invalidTime = !/^\d{2}:\d{2}$/.test(slotTime);
            return (
              <div className="space-y-4 pt-4">
                {missingCourseDate && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded space-y-2">
                    <p className="font-medium">
                      Dieser Kurs hat noch kein Datum. Slots können erst angelegt werden, wenn das Kursdatum gesetzt ist.
                    </p>
                    <p className="text-xs">
                      Schließe diesen Dialog, klicke beim Kurs auf „Bearbeiten" und setze zuerst das Kursdatum.
                    </p>
                  </div>
                )}
                <div>
                  <Label htmlFor="slot_time">Startzeit</Label>
                  <Input
                    id="slot_time"
                    type="time"
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                    // Keep the field editable even if the course has no
                    // date, so Safari / older Firefox don't swallow the
                    // keyboard input silently. The save button below
                    // still guards on course_date.
                  />
                  {course?.course_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      am {format(parseISO(course.course_date), "dd.MM.yyyy", { locale: de })}
                    </p>
                  )}
                  {!missingCourseDate && invalidTime && slotTime && (
                    <p className="text-xs text-red-600 mt-1">
                      Ungültige Zeit. Bitte im Format HH:MM eingeben.
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
                  disabled={missingCourseDate || invalidTime}
                >
                  {editingSlotId ? "Änderungen speichern" : "Slot anlegen"}
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Behandlungsangebote</h1>
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

          const activeSlots = courseSlots.filter((s) => !s.blocked);
          const blockedCount = courseSlots.length - activeSlots.length;
          const totalCapacity = activeSlots.reduce((sum, s) => sum + s.capacity, 0);
          const bookedCount = activeSlots.reduce((sum, s) => {
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
                  <span className="shrink-0">
                    {course.status === "offline"
                      ? <Badge variant="secondary" className="text-xs">Offline</Badge>
                      : <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50">Live</Badge>
                    }
                  </span>
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
                    {blockedCount > 0 && (
                      <span className="text-xs font-normal text-muted-foreground ml-1" title={`${blockedCount} Slot(s) gesperrt`}>
                        (+{blockedCount} <Ban className="inline h-3 w-3 -mt-0.5" />)
                      </span>
                    )}
                  </span>
                </button>

                {isAdmin && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" title="Kurs bearbeiten"
                      onClick={(e) => { e.stopPropagation(); openEditCourse(course); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Kurs duplizieren"
                      onClick={(e) => { e.stopPropagation(); openDuplicate(course); }}>
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
                        setEditingSlotId(null);
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
                              className={`flex items-center gap-4 py-2 px-2 rounded-md ${slot.blocked ? "bg-red-50/60" : "bg-muted/40"}`}
                            >
                              <span className={`w-28 shrink-0 text-sm font-medium ${slot.blocked ? "line-through text-muted-foreground" : ""}`}>
                                {format(new Date(slot.start_time), "HH:mm")} Uhr
                              </span>

                              <div className="w-24 shrink-0">
                                {slot.blocked
                                  ? <Badge variant="destructive" className="text-xs">Gesperrt</Badge>
                                  : slotBooked > 0
                                    ? <Badge variant="default" className="text-xs">Gebucht</Badge>
                                    : <span className="text-sm text-muted-foreground">Frei</span>
                                }
                              </div>

                              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                {slot.blocked ? (
                                  <span className="text-sm text-muted-foreground italic">{slot.blocked_note || "Gesperrt"}</span>
                                ) : slotBookings.length > 0 ? slotBookings.map((b) => (
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

                              <span className={`w-24 shrink-0 text-sm font-semibold text-center ${slot.blocked ? "text-muted-foreground" : slotBooked === slot.capacity ? "text-green-600" : "text-red-500"}`}>
                                {slot.blocked ? "—" : `${slotBooked}/${slot.capacity}`}
                              </span>

                              {isAdmin && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-8 p-0"
                                    onClick={() => {
                                      setSelectedCourseId(course.id);
                                      setEditingSlotId(slot.id);
                                      setSlotTime(format(new Date(slot.start_time), "HH:mm"));
                                      setSlotCapacity(String(slot.capacity));
                                      setSlotDialogOpen(true);
                                    }}
                                    title="Slot bearbeiten"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`w-8 p-0 ${slot.blocked ? "text-green-600 hover:text-green-700" : "text-muted-foreground hover:text-destructive"}`}
                                    onClick={() => slot.blocked ? handleUnblockSlot(slot.id) : setBlockSlotId(slot.id)}
                                    title={slot.blocked ? "Slot freigeben" : "Slot sperren"}
                                  >
                                    {slot.blocked ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                  </Button>
                                  <Button variant="ghost" size="sm" className="w-8 p-0" onClick={() => setDeleteSlotConfirm(slot.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
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
