"use client";

import { AvailableSlot, Course } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, ChevronRight } from "lucide-react";
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
    slotCount: number;
    totalCapacity: number;
  }[];
}

export function CoursesOverview({ courses, slots }: CoursesOverviewProps) {
  // Group courses by title
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
          <h1 className="text-lg font-semibold tracking-tight">EPHIA Proband:innen-Buchung</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Buche Deinen Behandlungstermin fuer unsere aesthetischen Schulungskurse
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {groups.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              Derzeit sind keine Kurse mit verfuegbaren Terminen vorhanden.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <Card key={group.title} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">{group.title}</CardTitle>
                  {group.description && (
                    <CardDescription className="mt-1 leading-relaxed">
                      {group.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Verfuegbare Termine
                  </h3>
                  <div className="grid gap-2">
                    {group.dates.map(({ course, slotCount, totalCapacity }) => (
                      <Link
                        key={course.id}
                        href={`/book/${course.id}`}
                        className="block"
                      >
                        <div className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-all group">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="text-sm font-medium">
                                {course.course_date
                                  ? format(new Date(course.course_date + "T00:00:00"), "EEEE, dd. MMMM yyyy", { locale: de })
                                  : "Datum wird bekannt gegeben"}
                              </span>
                              <span className="text-xs text-muted-foreground ml-3">
                                {slotCount} {slotCount === 1 ? "Zeitfenster" : "Zeitfenster"} · {totalCapacity} {totalCapacity === 1 ? "Platz" : "Plaetze"} frei
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs border-primary/30 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              Zu den Terminen
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
