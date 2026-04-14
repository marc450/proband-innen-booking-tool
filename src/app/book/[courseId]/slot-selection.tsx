"use client";

import { useState } from "react";
import { AvailableSlot, Course } from "@/lib/types";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, ChevronDown, Clock, Info, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { BookingForm } from "../booking-form";

interface SlotSelectionProps {
  course: Course;
  allCourses: Course[];
  slots: AvailableSlot[];
}

export function SlotSelection({ course, allCourses, slots }: SlotSelectionProps) {
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  // Build date entries from allCourses
  const dateEntries = allCourses
    .map((c) => ({
      course: c,
      slots: slots.filter((s) => s.course_id === c.id),
    }))
    .filter((entry) => entry.slots.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-black/10 bg-background h-[55px] flex items-center">
        <div className="max-w-3xl mx-auto px-5 md:px-8 w-full">
          <a href="https://ephia.de" target="_blank" rel="noopener noreferrer" className="inline-block">
            <img src="/logo.svg" alt="EPHIA" style={{ width: "203px", height: "auto" }} />
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14">
        {selectedSlot ? (
          <div>
            <button
              onClick={() => setSelectedSlot(null)}
              className="text-sm text-black/60 hover:text-black mb-6 inline-flex items-center gap-1"
            >
              &larr; Zurück zur Terminauswahl
            </button>
            <div className="bg-white rounded-[10px] p-6 md:p-7 mb-6">
              <h2 className="text-xl md:text-2xl font-bold tracking-wide leading-tight text-black text-balance">
                {course.treatment_title || course.title}
              </h2>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-sm text-black/70">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(selectedSlot.start_time), "dd. MMMM yyyy", { locale: de })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {format(new Date(selectedSlot.start_time), "HH:mm")} Uhr
                </span>
              </div>
            </div>
            <BookingForm slot={selectedSlot} guidePrice={course.guide_price} />
          </div>
        ) : (
          <div>
            <Link
              href="/"
              className="text-sm text-black/60 hover:text-black mb-6 inline-flex items-center gap-1"
            >
              &larr; Zurück zur Kursübersicht
            </Link>

            <h1 className="text-2xl md:text-3xl font-bold tracking-wide leading-tight text-black whitespace-nowrap overflow-hidden text-ellipsis">
              {course.treatment_title || course.title}
            </h1>
            <p className="text-sm md:text-base text-black/70 leading-relaxed mt-3 mb-8">
              Tippe auf ein Datum, um die verfügbaren Zeitfenster zu sehen.
            </p>

            {dateEntries.length === 0 ? (
              <div className="bg-white rounded-[10px] p-10 text-center">
                <p className="text-base text-black/70">
                  Für diesen Kurs sind leider keine Termine mehr verfügbar.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {dateEntries.map(({ course: dateCourse, slots: dateSlots }) => {
                  const isExpanded = expandedCourseId === dateCourse.id;
                  const dateLabel = dateCourse.course_date
                    ? format(new Date(dateCourse.course_date + "T00:00:00"), "EEEE, dd. MMMM yyyy", { locale: de })
                    : "Datum wird bekannt gegeben";
                  const totalCapacity = dateSlots.reduce((s, sl) => s + sl.remaining_capacity, 0);

                  return (
                    <article
                      key={dateCourse.id}
                      className="bg-white rounded-[10px] overflow-hidden"
                    >
                      {/* Entire card header is a single clickable button so the
                          date row + Dozent:in/Ort area all trigger the expand. */}
                      <button
                        onClick={() => setExpandedCourseId(isExpanded ? null : dateCourse.id)}
                        className="w-full text-left hover:bg-black/[0.02] transition-colors"
                        aria-expanded={isExpanded}
                      >
                        <div className="px-5 md:px-6 py-5">
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-base md:text-lg font-bold text-black leading-tight">
                              {dateLabel}
                            </p>
                            <div className="flex items-center gap-1.5 text-[#0066FF] shrink-0">
                              <span className="text-xs md:text-sm font-bold hidden sm:inline">
                                {isExpanded ? "Schließen" : "Anzeigen"}
                              </span>
                              <ChevronDown
                                className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                strokeWidth={2.25}
                              />
                            </div>
                          </div>

                          <div className="mt-3 space-y-1.5 text-sm text-black/70">
                            <div className="flex items-center gap-2">
                              <Users className="h-3.5 w-3.5 shrink-0" />
                              <span>{totalCapacity} {totalCapacity === 1 ? "Platz" : "Plätze"} frei</span>
                            </div>
                            {dateCourse.instructor && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                <span>Dozent:in: {dateCourse.instructor}</span>
                              </div>
                            )}
                            {dateCourse.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span>{dateCourse.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Expanded time slots */}
                      {isExpanded && (
                        <div className="border-t border-black/[0.06]">
                          <div className="flex items-start gap-2.5 px-5 md:px-6 py-4 bg-amber-50 border-b border-amber-200">
                            <span className="text-base shrink-0" aria-hidden="true">⚠️</span>
                            <p className="text-sm md:text-base font-medium text-amber-900 leading-relaxed">
                              Bitte wähle das <strong className="font-bold">früheste verfügbare Zeitfenster</strong>. Buchungen, die zu Lücken führen, können von uns geändert oder storniert werden.
                            </p>
                          </div>
                          <div className="divide-y divide-black/[0.06]">
                            {dateSlots.map((slot) => (
                              <button
                                key={slot.id}
                                onClick={() => setSelectedSlot(slot)}
                                className="group w-full flex items-center justify-between gap-3 md:gap-4 px-5 md:px-6 py-4 hover:bg-black/[0.02] transition-colors text-left"
                              >
                                <div className="flex items-center gap-3 md:gap-5 min-w-0">
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Clock className="h-4 w-4 text-black/55" />
                                    <span className="text-sm md:text-base font-bold text-black whitespace-nowrap">
                                      {format(new Date(slot.start_time), "HH:mm")} Uhr
                                    </span>
                                  </div>
                                  <span className="text-xs md:text-sm text-black/60 whitespace-nowrap">
                                    {slot.remaining_capacity} {slot.remaining_capacity === 1 ? "Platz" : "Plätze"} frei
                                  </span>
                                </div>
                                <span className="text-xs md:text-sm font-bold text-[#0066FF] shrink-0 group-hover:underline whitespace-nowrap">
                                  <span className="hidden sm:inline">Platz reservieren</span>
                                  <span className="sm:hidden">Reservieren</span>
                                  {" "}&rarr;
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
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
