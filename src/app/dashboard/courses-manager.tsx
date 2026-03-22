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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Plus, Trash2, Edit } from "lucide-react";

interface Props {
  initialCourses: Course[];
  initialSlots: Slot[];
}

export function CoursesManager({ initialCourses, initialSlots }: Props) {
  const [courses, setCourses] = useState(initialCourses);
  const [slots, setSlots] = useState(initialSlots);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Course form
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");

  // Slot form
  const [slotStartTime, setSlotStartTime] = useState("");
  const [slotEndTime, setSlotEndTime] = useState("");
  const [slotCapacity, setSlotCapacity] = useState("1");

  const supabase = createClient();

  const resetCourseForm = () => {
    setCourseTitle("");
    setCourseDescription("");
    setEditingCourse(null);
  };

  const handleSaveCourse = async () => {
    if (!courseTitle.trim()) return;

    if (editingCourse) {
      const { data, error } = await supabase
        .from("courses")
        .update({ title: courseTitle, description: courseDescription || null })
        .eq("id", editingCourse.id)
        .select()
        .single();

      if (!error && data) {
        setCourses(courses.map((c) => (c.id === data.id ? data : c)));
      }
    } else {
      const { data, error } = await supabase
        .from("courses")
        .insert({ title: courseTitle, description: courseDescription || null })
        .select()
        .single();

      if (!error && data) {
        setCourses([data, ...courses]);
      }
    }

    setCourseDialogOpen(false);
    resetCourseForm();
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Kurs wirklich löschen? Alle zugehörigen Slots und Buchungen werden ebenfalls gelöscht.")) return;

    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (!error) {
      setCourses(courses.filter((c) => c.id !== id));
      setSlots(slots.filter((s) => s.course_id !== id));
    }
  };

  const handleSaveSlot = async () => {
    if (!selectedCourseId || !slotStartTime || !slotEndTime) return;

    const { data, error } = await supabase
      .from("slots")
      .insert({
        course_id: selectedCourseId,
        start_time: new Date(slotStartTime).toISOString(),
        end_time: new Date(slotEndTime).toISOString(),
        capacity: parseInt(slotCapacity) || 1,
      })
      .select()
      .single();

    if (!error && data) {
      setSlots([...slots, data]);
    }

    setSlotDialogOpen(false);
    setSlotStartTime("");
    setSlotEndTime("");
    setSlotCapacity("1");
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm("Slot wirklich löschen?")) return;

    const { error } = await supabase.from("slots").delete().eq("id", id);
    if (!error) {
      setSlots(slots.filter((s) => s.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kurse & Slots</h1>
        <Dialog open={courseDialogOpen} onOpenChange={(open) => {
          setCourseDialogOpen(open);
          if (!open) resetCourseForm();
        }}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Kurs
          </DialogTrigger>
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
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Noch keine Kurse angelegt. Erstelle den ersten Kurs.
          </CardContent>
        </Card>
      ) : (
        courses.map((course) => {
          const courseSlots = slots.filter((s) => s.course_id === course.id);
          return (
            <Card key={course.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{course.title}</CardTitle>
                  {course.description && (
                    <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingCourse(course);
                      setCourseTitle(course.title);
                      setCourseDescription(course.description || "");
                      setCourseDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCourse(course.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Slots</h3>
                  <Dialog open={slotDialogOpen && selectedCourseId === course.id} onOpenChange={(open) => {
                    setSlotDialogOpen(open);
                    if (open) setSelectedCourseId(course.id);
                  }}>
                    <DialogTrigger render={<Button variant="outline" size="sm" onClick={() => setSelectedCourseId(course.id)} />}>
                      <Plus className="h-4 w-4 mr-1" />
                      Slot
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Neuer Slot</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <Label htmlFor="start">Beginn</Label>
                          <Input
                            id="start"
                            type="datetime-local"
                            value={slotStartTime}
                            onChange={(e) => setSlotStartTime(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="end">Ende</Label>
                          <Input
                            id="end"
                            type="datetime-local"
                            value={slotEndTime}
                            onChange={(e) => setSlotEndTime(e.target.value)}
                          />
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
                        <Button onClick={handleSaveSlot} className="w-full">
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
                        <TableHead>Datum</TableHead>
                        <TableHead>Zeit</TableHead>
                        <TableHead>Kapazität</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courseSlots.map((slot) => (
                        <TableRow key={slot.id}>
                          <TableCell>
                            {format(new Date(slot.start_time), "dd.MM.yyyy", { locale: de })}
                          </TableCell>
                          <TableCell>
                            {format(new Date(slot.start_time), "HH:mm")} &ndash;{" "}
                            {format(new Date(slot.end_time), "HH:mm")}
                          </TableCell>
                          <TableCell>{slot.capacity}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSlot(slot.id)}
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
