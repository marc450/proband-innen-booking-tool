"use client";

import { AvailableSlot, Course } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, Euro, Stethoscope } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface CoursesOverviewProps {
  courses: Course[];
  slots: AvailableSlot[];
}

interface CourseGroup {
  title: string;
  description: string | null;
  firstCourse: Course;
  totalSlots: number;
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
        totalSlots: 0,
      });
    } else {
      // Prefer a course that has an image
      const existing = groupedMap.get(course.title)!;
      if (!existing.firstCourse.image_url && course.image_url) {
        existing.firstCourse = course;
      }
    }

    groupedMap.get(course.title)!.totalSlots += courseSlots.length;
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
              <Card key={group.title} className="shadow-sm overflow-hidden pt-0 gap-0">
                {/* Course image */}
                {group.firstCourse.image_url ? (
                  <Image
                    src={group.firstCourse.image_url}
                    alt={group.title}
                    width={800}
                    height={450}
                    className="w-full aspect-video object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                    priority
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
                  {(group.firstCourse.service_description || group.firstCourse.guide_price) && (
                    <div className="border-t mx-5" />
                  )}
                  {(group.firstCourse.service_description || group.firstCourse.guide_price) && (
                    <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {group.firstCourse.service_description && (
                        <div className="flex gap-3">
                          <Stethoscope className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Leistung</span>
                            <p className="text-sm mt-0.5">{group.firstCourse.service_description}</p>
                          </div>
                        </div>
                      )}
                      {group.firstCourse.guide_price && (
                        <div className="flex gap-3">
                          <Euro className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Richtpreis</span>
                            <p className="text-lg font-bold mt-0.5">{group.firstCourse.guide_price}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pricing disclaimer */}
                  {group.firstCourse.guide_price && (
                    <div className="mx-5 mb-4 bg-muted/50 rounded-md px-3 py-2">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Die Bezahlung erfolgt nach der Behandlung vor Ort. Die Abrechnung erfolgt nach GOÄ. Der Richtpreis dient als Orientierung. Der genaue Behandlungsumfang und die endgültigen Kosten werden im persönlichen Aufklärungsgespräch mit der behandelnden Ärzt:in festgelegt.
                      </p>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="border-t px-5 py-4">
                    <Link href={`/book/${group.firstCourse.id}`}>
                      <Button className="w-full">Zu den Terminen</Button>
                    </Link>
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
