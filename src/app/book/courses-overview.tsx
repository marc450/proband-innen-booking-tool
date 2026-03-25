"use client";

import { useState } from "react";
import { AvailableSlot, Course } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, ChevronDown, ChevronRight, Clock, ImageIcon, Euro, Stethoscope, Users } from "lucide-react";
import Link from "next/link";

interface CoursesOverviewProps {
  courses: Course[];
  slots: AvailableSlot[];
}

interface CourseGroup {
  title: string;
  description: string | null;
  dates: {
    course: Course;
    slots: AvailableSlot[];
  }[];
}

function CourseCard({ group }: { group: CourseGroup }) {
  const [showDates, setShowDates] = useState(false);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const firstCourse = group.dates[0]?.course;

  return (
    <Card className="shadow-sm overflow-hidden">
      {/* Course image */}
      {firstCourse?.image_url ? (
        <img
          src={firstCourse.image_url}
          alt={group.title}
          className="w-full aspect-video object-cover"
        />
      ) : (
        <div className="w-full aspect-video bg-muted flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <ImageIcon className="h-10 w-10 mx-auto mb-1 opacity-40" />
            <span className="text-xs opacity-40">Kursbild</span>
          </div>
        </div>
      )}

      <CardContent className="p-0">
        {/* Title + description */}
        <div className="px-5 pt-5 pb-4">
          <h2 className="text-xl font-bold">{group.title}</h2>
          {group.description && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {group.description}
            </p>
          )}
        </div>

        {/* Info grid: Leistung + Richtpreis */}
        {(firstCourse?.service_description || firstCourse?.guide_price) && (
          <div className="border-t mx-5" />
        )}
        {(firstCourse?.service_description || firstCourse?.guide_price) && (
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {firstCourse.service_description && (
              <div className="flex gap-3">
                <Stethoscope className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Leistung</span>
                  <p className="text-sm mt-0.5">{firstCourse.service_description}</p>
                </div>
              </div>
            )}
            {firstCourse.guide_price && (
              <div className="flex gap-3">
                <Euro className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Richtpreis</span>
                  <p className="text-lg font-bold mt-0.5">{firstCourse.guide_price}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pricing disclaimer */}
        {firstCourse?.guide_price && (
          <div className="mx-5 mb-4 bg-muted/50 rounded-md px-3 py-2">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Die Bezahlung erfolgt nach der Behandlung vor Ort. Die Abrechnung erfolgt nach GOÄ. Der Richtpreis dient als Orientierung. Der genaue Behandlungsumfang und die endgültigen Kosten werden im persönlichen Aufklärungsgespräch mit der behandelnden Ärzt:in festgelegt.
            </p>
          </div>
        )}

        {/* CTA / Dates accordion */}
        <div className="border-t px-5 py-4">
          {!showDates ? (
            <Button className="w-full" onClick={() => setShowDates(true)}>
              Zu den Terminen
            </Button>
          ) : (
            <div className="space-y-2">
              {group.dates.map(({ course, slots }) => {
                const isExpanded = expandedCourseId === course.id;
                const dateLabel = course.course_date
                  ? format(new Date(course.course_date + "T00:00:00"), "EEEE, dd. MMMM yyyy", { locale: de })
                  : "Datum wird bekannt gegeben";
                const totalCapacity = slots.reduce((s, sl) => s + sl.remaining_capacity, 0);

                return (
                  <div key={course.id} className="rounded-lg border overflow-hidden">
                    {/* Date row */}
                    <button
                      onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{dateLabel}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {slots.length} Zeitfenster · {totalCapacity} {totalCapacity === 1 ? "Platz" : "Plätze"} frei
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {/* Expanded time slots */}
                    {isExpanded && (
                      <div className="border-t divide-y bg-muted/20">
                        {slots.map((slot) => (
                          <Link
                            key={slot.id}
                            href={`/book/${course.id}?slot=${slot.id}`}
                            className="flex items-center justify-between px-4 py-2.5 hover:bg-accent/50 transition-colors group"
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
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="outline" className="text-xs border-primary/30 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                Buchen
                              </Badge>
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                onClick={() => { setShowDates(false); setExpandedCourseId(null); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground pt-1 pb-0.5"
              >
                Termine ausblenden
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CoursesOverview({ courses, slots }: CoursesOverviewProps) {
  const groupedMap = new Map<string, CourseGroup>();

  for (const course of courses) {
    const courseSlots = slots.filter((s) => s.course_id === course.id);
    if (courseSlots.length === 0) continue;

    if (!groupedMap.has(course.title)) {
      groupedMap.set(course.title, {
        title: course.title,
        description: course.description,
        dates: [],
      });
    }

    const group = groupedMap.get(course.title)!;
    group.dates.push({ course, slots: courseSlots });
  }

  const groups = Array.from(groupedMap.values());

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <h1 className="text-lg font-semibold tracking-tight">EPHIA Proband:innen-Buchung</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Buche Deinen Behandlungstermin für unsere ästhetischen Schulungskurse
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {groups.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              Derzeit sind keine Kurse mit verfügbaren Terminen vorhanden.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {groups.map((group) => (
              <CourseCard key={group.title} group={group} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
