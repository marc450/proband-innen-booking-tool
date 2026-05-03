"use client";

import { useState } from "react";
import { AvailableSlot, Course } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBerlinDate, formatBerlinLongDate, formatBerlinTime } from "@/lib/date";
import { Calendar, Clock, Users } from "lucide-react";
import { BookingForm } from "./booking-form";

interface BookingPageProps {
  courses: Course[];
  slots: AvailableSlot[];
}

export function BookingPage({ courses, slots }: BookingPageProps) {
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Group slots by course
  const slotsByCourse = courses
    .map((course) => ({
      course,
      slots: slots.filter((s) => s.course_id === course.id),
    }))
    .filter((group) => group.slots.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-black/10 bg-background h-[55px] flex items-center">
        <div className="max-w-lg mx-auto px-4 w-full">
          <a href="https://ephia.de" target="_blank" rel="noopener noreferrer" className="inline-block">
            <img src="/logo.svg" alt="EPHIA" style={{ width: "203px", height: "auto" }} />
          </a>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {selectedSlot ? (
          <div>
            <button
              onClick={() => setSelectedSlot(null)}
              className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1"
            >
              &larr; Zurueck zur Uebersicht
            </button>
            <Card className="mb-6 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{selectedSlot.course_title}</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatBerlinLongDate(selectedSlot.start_time)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {formatBerlinTime(selectedSlot.start_time)} Uhr
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>

            <BookingForm slot={selectedSlot} />
          </div>
        ) : (
          <div className="space-y-6">
            {slotsByCourse.length === 0 && (
              <Card className="shadow-sm">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Derzeit sind keine Termine verfuegbar.
                </CardContent>
              </Card>
            )}

            {slotsByCourse.map(({ course, slots: courseSlots }) => (
              <div key={course.id}>
                <h2 className="text-base font-semibold mb-2">{course.title}</h2>
                {course.description && (
                  <p className="text-sm text-muted-foreground mb-3">{course.description}</p>
                )}
                <div className="grid gap-2">
                  {courseSlots.map((slot) => (
                    <Card
                      key={slot.id}
                      className="cursor-pointer shadow-sm hover:shadow-md hover:border-primary/50 transition-all"
                      onClick={() => setSelectedSlot(slot)}
                    >
                      <CardContent className="flex items-center justify-between py-3.5 px-4">
                        <div className="flex items-center gap-5">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {formatBerlinDate(slot.start_time)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">
                              {formatBerlinTime(slot.start_time)} Uhr
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {slot.remaining_capacity} {slot.remaining_capacity === 1 ? "Platz" : "Plaetze"} frei
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">Buchen</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
