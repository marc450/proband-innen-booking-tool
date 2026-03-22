"use client";

import { useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { AvailableSlot, Course } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, Clock, Users } from "lucide-react";
import { BookingForm } from "./booking-form";

interface BookingPageProps {
  courses: Course[];
  slots: AvailableSlot[];
}

export function BookingPage({ courses, slots }: BookingPageProps) {
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [bookingComplete, setBookingComplete] = useState(false);

  // Group slots by course
  const slotsByCourse = courses
    .map((course) => ({
      course,
      slots: slots.filter((s) => s.course_id === course.id),
    }))
    .filter((group) => group.slots.length > 0);

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-green-600 text-2xl">Buchung bestätigt!</CardTitle>
            <CardDescription className="text-base mt-2">
              Vielen Dank für Ihre Buchung. Sie erhalten eine Bestätigung per E-Mail.
              Bitte beachten Sie: Bei Nichterscheinen oder Absage weniger als 24 Stunden
              vor dem Termin wird eine Gebühr von 50 EUR erhoben.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">EPHIA Proband:innen-Buchung</h1>
          <p className="text-muted-foreground mt-1">
            Buchen Sie Ihren Behandlungstermin für unsere ästhetischen Schulungskurse
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {selectedSlot ? (
          <div>
            <button
              onClick={() => setSelectedSlot(null)}
              className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1"
            >
              &larr; Zurück zur Übersicht
            </button>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{selectedSlot.course_title}</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedSlot.start_time), "dd. MMMM yyyy", { locale: de })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(selectedSlot.start_time), "HH:mm")} &ndash;{" "}
                    {format(new Date(selectedSlot.end_time), "HH:mm")}
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>

            <Elements stripe={stripePromise}>
              <BookingForm
                slot={selectedSlot}
                onComplete={() => setBookingComplete(true)}
              />
            </Elements>
          </div>
        ) : (
          <div className="space-y-8">
            {slotsByCourse.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Derzeit sind keine Termine verfügbar.
                </CardContent>
              </Card>
            )}

            {slotsByCourse.map(({ course, slots: courseSlots }) => (
              <div key={course.id}>
                <h2 className="text-xl font-semibold mb-3">{course.title}</h2>
                {course.description && (
                  <p className="text-muted-foreground mb-4">{course.description}</p>
                )}
                <div className="grid gap-3">
                  {courseSlots.map((slot) => (
                    <Card
                      key={slot.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setSelectedSlot(slot)}
                    >
                      <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(new Date(slot.start_time), "dd.MM.yyyy")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {format(new Date(slot.start_time), "HH:mm")} &ndash;{" "}
                              {format(new Date(slot.end_time), "HH:mm")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {slot.remaining_capacity} Plätze frei
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline">Buchen</Badge>
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
