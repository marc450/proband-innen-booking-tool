"use client";

import { useState } from "react";
import { AvailableSlot, Course } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, ChevronDown, Clock, ImageIcon, Users } from "lucide-react";
import Link from "next/link";

interface CoursesOverviewProps {
  courses: Course[];
  slots: AvailableSlot[];
}

interface CourseGroup {
  title: string;
  description: string | null;
  firstCourse: Course;
  dates: {
    course: Course;
    slots: AvailableSlot[];
  }[];
}

function CourseCard({ group }: { group: CourseGroup }) {
  const [open, setOpen] = useState(false);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  return (
    <Card className="overflow-hidden flex flex-col shadow-md rounded-2xl border-0">
      {/* Full-bleed image */}
      {group.firstCourse.image_url ? (
        <img
          src={group.firstCourse.image_url}
          alt={group.title}
          className="w-full aspect-video object-cover"
        />
      ) : (
        <div className="w-full aspect-video bg-muted flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <ImageIcon className="h-10 w-10 mx-auto mb-1 opacity-30" />
            <span className="text-xs opacity-30">Kursbild</span>
          </div>
        </div>
      )}

      {/* Card body */}
      <div className="flex flex-col flex-1 px-6 pt-5 pb-6 bg-card">
        <h2 className="text-2xl font-bold tracking-tight leading-tight">{group.title}</h2>

        {group.firstCourse.service_description && (
          <p className="text-sm font-medium text-primary mt-1">{group.firstCourse.service_description}</p>
        )}

        {group.firstCourse.description && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-3">
            {group.firstCourse.description}
          </p>
        )}

        {group.firstCourse.guide_price && (
          <p className="mt-3 text-sm text-muted-foreground">
            Richtpreis: <span className="font-semibold text-foreground">{group.firstCourse.guide_price}</span>
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1 min-h-4" />

        {/* CTA */}
        {!open ? (
          <Button
            size="lg"
            className="w-full mt-4 rounded-xl"
            onClick={() => setOpen(true)}
          >
            Zu den Terminen
          </Button>
        ) : (
          <div className="mt-4 space-y-2">
            {group.dates.map(({ course, slots }) => {
              const isExpanded = expandedCourseId === course.id;
              const dateLabel = course.course_date
                ? format(new Date(course.course_date + "T00:00:00"), "EEEE, dd. MMMM yyyy", { locale: de })
                : "Datum wird bekannt gegeben";
              const totalCapacity = slots.reduce((s, sl) => s + sl.remaining_capacity, 0);

              return (
                <div key={course.id} className="rounded-xl border overflow-hidden">
                  <button
                    onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-accent/50 transition-colors text-left"
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

                  {isExpanded && (
                    <div className="border-t bg-muted/30 divide-y">
                      {slots.map((slot) => (
                        <Link
                          key={slot.id}
                          href={`/book/${course.id}?slot=${slot.id}`}
                          className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors group"
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
                          <Badge variant="outline" className="text-xs border-primary/30 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                            Buchen
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => { setOpen(false); setExpandedCourseId(null); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground pt-1"
            >
              Termine ausblenden
            </button>
          </div>
        )}
      </div>
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
        firstCourse: course,
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
          <div className="py-12 text-center text-muted-foreground">
            Derzeit sind keine Kurse mit verfügbaren Terminen vorhanden.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {groups.map((group) => (
              <CourseCard key={group.title} group={group} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
