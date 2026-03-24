"use client";

import { useState } from "react";
import { AvailableSlot, Course } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, Clock, Users } from "lucide-react";
import Link from "next/link";
import { BookingForm } from "../booking-form";

interface SlotSelectionProps {
  course: Course;
  slots: AvailableSlot[];
}

export function SlotSelection({ course, slots }: SlotSelectionProps) {
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const courseDate = course.course_date
    ? format(new Date(course.course_date + "T00:00:00"), "EEEE, dd. MMMM yyyy", { locale: de })
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 py-5">
          <h1 className="text-lg font-semibold tracking-tight">EPHIA Proband:innen-Buchung</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Buche Deinen Behandlungstermin
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
              &larr; Zurueck zur Zeitfensterauswahl
            </button>
            <Card className="mb-6 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{course.title}</CardTitle>
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
            <BookingForm slot={selectedSlot} />
          </div>
        ) : (
          <div>
            <Link
              href="/book"
              className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1"
            >
              &larr; Zurueck zur Kursuebersicht
            </Link>

            <Card className="mt-4 mb-6 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">{course.title}</CardTitle>
                {course.description && (
                  <CardDescription className="mt-1 leading-relaxed">
                    {course.description}
                  </CardDescription>
                )}
                {courseDate && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {courseDate}
                  </div>
                )}
                {course.instructor && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Kursleitende:r Ärzt:in: {course.instructor}
                  </p>
                )}
              </CardHeader>
            </Card>

            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Verfuegbare Zeitfenster
            </h2>

            {slots.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Fuer diesen Kurs sind leider keine Termine mehr verfuegbar.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2">
                {slots.map((slot) => (
                  <Card
                    key={slot.id}
                    className="cursor-pointer shadow-sm hover:shadow-md hover:border-primary/50 transition-all"
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <CardContent className="flex items-center justify-between py-3.5 px-4">
                      <div className="flex items-center gap-5">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {format(new Date(slot.start_time), "HH:mm")} Uhr
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {slot.remaining_capacity} {slot.remaining_capacity === 1 ? "Platz" : "Plaetze"} frei
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                        Buchen
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
