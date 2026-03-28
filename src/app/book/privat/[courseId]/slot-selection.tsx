"use client";

import { useState } from "react";
import { AvailableSlot, Course } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, ChevronDown, Clock, Info, Users } from "lucide-react";
import Link from "next/link";
import { PrivatBookingForm } from "../booking-form";

interface Props {
  course: Course;
  allCourses: Course[];
  slots: AvailableSlot[];
}

export function PrivatSlotSelection({ course, allCourses, slots }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  const dateEntries = allCourses
    .map((c) => ({
      course: c,
      slots: slots.filter((s) => s.course_id === c.id),
    }))
    .filter((entry) => entry.slots.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 py-5">
          <h1 className="text-lg font-semibold tracking-tight">EPHIA Privatpatient:innen-Buchung</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Buche Deinen Behandlungstermin als Privatpatient:in
          </p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {selectedSlot ? (
          <div>
            <button
              onClick={() => setSelectedSlot(null)}
              className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1"
            >
              &larr; Zurück zur Terminauswahl
            </button>
            <Card className="mb-6 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{course.treatment_title || course.title}</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(selectedSlot.start_time), "dd. MMMM yyyy", { locale: de })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(selectedSlot.start_time), "HH:mm")} Uhr
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>
            <PrivatBookingForm slot={selectedSlot} />
          </div>
        ) : (
          <div>
            <Link
              href="/book/privat"
              className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1"
            >
              &larr; Zurück zur Kursübersicht
            </Link>

            <h2 className="text-lg font-semibold mt-4 mb-1">{course.treatment_title || course.title}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Wähle einen Termin und ein Zeitfenster
            </p>

            {dateEntries.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Für diesen Kurs sind leider keine Termine mehr verfügbar.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {dateEntries.map(({ course: dateCourse, slots: dateSlots }) => {
                  const isExpanded = expandedCourseId === dateCourse.id;
                  const dateLabel = dateCourse.course_date
                    ? format(new Date(dateCourse.course_date + "T00:00:00"), "EEEE, dd. MMMM yyyy", { locale: de })
                    : "Datum wird bekannt gegeben";
                  const totalCapacity = dateSlots.reduce((s, sl) => s + sl.remaining_capacity, 0);

                  return (
                    <Card key={dateCourse.id} className="shadow-sm overflow-hidden">
                      <button
                        onClick={() => setExpandedCourseId(isExpanded ? null : dateCourse.id)}
                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent/30 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-sm font-semibold">{dateLabel}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {dateSlots.length} Zeitfenster · {totalCapacity} {totalCapacity === 1 ? "Platz" : "Plätze"} frei
                              {dateCourse.instructor && ` · ${dateCourse.instructor}`}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>

                      {isExpanded && (
                        <div className="divide-y">
                          <div className="flex items-start gap-2 px-4 py-3 bg-blue-50/50">
                            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-blue-900">
                              Bitte wähle das <strong>früheste verfügbare Zeitfenster</strong>, damit keine Behandlungslücken in unserem Kurs auftreten.
                            </p>
                          </div>
                          {dateSlots.map((slot) => (
                            <button
                              key={slot.id}
                              onClick={() => setSelectedSlot(slot)}
                              className="w-full flex items-center justify-between px-5 py-3 hover:bg-accent/30 transition-colors text-left"
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    {format(new Date(slot.start_time), "HH:mm")} Uhr
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {slot.remaining_capacity} {slot.remaining_capacity === 1 ? "Platz" : "Plätze"} frei
                                  </span>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs border-primary/30 text-primary shrink-0">
                                Buchen
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
