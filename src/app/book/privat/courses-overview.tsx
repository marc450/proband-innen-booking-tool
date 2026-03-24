"use client";

import { AvailableSlot, Course } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, ChevronRight, ImageIcon, Stethoscope } from "lucide-react";
import Link from "next/link";

interface Props {
  courses: Course[];
  slots: AvailableSlot[];
}

interface CourseGroup {
  title: string;
  description: string | null;
  dates: {
    course: Course;
    slotCount: number;
    totalCapacity: number;
  }[];
}

export function PrivatCoursesOverview({ courses, slots }: Props) {
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
    group.dates.push({
      course,
      slotCount: courseSlots.length,
      totalCapacity: courseSlots.reduce((sum, s) => sum + s.remaining_capacity, 0),
    });
  }

  const groups = Array.from(groupedMap.values());

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <h1 className="text-lg font-semibold tracking-tight">EPHIA Privatpatient:innen-Buchung</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Buchung als Privatpatient:in über Deine:n behandelnde:n Ärzt:in
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {groups.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              Derzeit sind keine Kurse mit verfügbaren Terminen vorhanden.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => {
              const firstCourse = group.dates[0]?.course;

              return (
                <Card key={group.title} className="shadow-sm overflow-hidden">
                  {firstCourse?.image_url ? (
                    <img
                      src={firstCourse.image_url}
                      alt={group.title}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="h-10 w-10 mx-auto mb-1 opacity-40" />
                        <span className="text-xs opacity-40">Kursbild</span>
                      </div>
                    </div>
                  )}

                  <CardContent className="p-0">
                    <div className="px-5 pt-5 pb-4">
                      <h2 className="text-xl font-bold">{group.title}</h2>
                      {group.description && (
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                          {group.description}
                        </p>
                      )}
                    </div>

                    {firstCourse?.service_description && (
                      <>
                        <div className="border-t mx-5" />
                        <div className="px-5 py-4">
                          <div className="flex gap-3">
                            <Stethoscope className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Leistung</span>
                              <p className="text-sm mt-0.5">{firstCourse.service_description}</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="border-t">
                      <div className="px-5 pt-4 pb-2">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Verfügbare Termine
                        </h3>
                      </div>
                      <div className="px-5 pb-5 space-y-2">
                        {group.dates.map(({ course, slotCount, totalCapacity }) => (
                          <Link
                            key={course.id}
                            href={`/book/privat/${course.id}`}
                            className="block"
                          >
                            <div className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-all group">
                              <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">
                                    {course.course_date
                                      ? format(new Date(course.course_date + "T00:00:00"), "EEEE, dd. MMMM yyyy", { locale: de })
                                      : "Datum wird bekannt gegeben"}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {slotCount} Zeitfenster · {totalCapacity} {totalCapacity === 1 ? "Platz" : "Plätze"} frei
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className="text-xs border-primary/30 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                  Buchen
                                </Badge>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
