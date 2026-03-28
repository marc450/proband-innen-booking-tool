"use client";

import { AvailableSlot, Course } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, MapPin } from "lucide-react";
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
      <header className="border-b border-black/10 bg-background h-[55px] flex items-center">
        <div className="max-w-5xl mx-auto px-4 w-full">
          <a href="https://ephia.de" target="_blank" rel="noopener noreferrer" className="inline-block">
            <img src="/logo.svg" alt="EPHIA" style={{ width: "203px", height: "auto" }} />
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-14">
          <h1 className="font-bold mb-4" style={{ fontFamily: "Roboto", fontSize: "3rem", fontWeight: "bold", letterSpacing: "0rem", lineHeight: 1.25, textTransform: "none", color: "#000000" }}>
            Behandlungstermin buchen
          </h1>
          <p className="max-w-xl mx-auto" style={{ fontFamily: "Roboto", fontWeight: "normal", fontSize: "1.0625rem", letterSpacing: "0rem", lineHeight: 1.65, textTransform: "none", color: "#000000" }}>
            Wähle Dein gewünschtes Behandlungsangebot und buche Deinen Termin als Proband:in in einem unserer ästhetischen Schulungskurse.
          </p>
        </div>

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
                  <div className="px-5 pt-5 pb-5">
                    {/* Title */}
                    <h2 className="text-xl font-bold leading-tight">{group.firstCourse.treatment_title || group.title}</h2>

                    {/* Service description as subtitle */}
                    {group.firstCourse.service_description && (
                      <p className="text-sm text-muted-foreground mt-1.5">
                        {group.firstCourse.service_description}
                      </p>
                    )}

                    {/* Price highlight */}
                    {group.firstCourse.guide_price && (
                      <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{group.firstCourse.guide_price}</span>
                        <span className="text-xs text-muted-foreground">Richtpreis*</span>
                      </div>
                    )}

                    {/* Compact details */}
                    <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                      {group.firstCourse.instructor && (
                        <p>Unter Anleitung von <span className="text-foreground font-medium">{group.firstCourse.instructor}</span></p>
                      )}
                      {group.firstCourse.location && (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>{group.firstCourse.location}</span>
                        </p>
                      )}
                    </div>

                    {/* Disclaimer footnote */}
                    {group.firstCourse.guide_price && (
                      <p className="mt-4 text-[11px] text-muted-foreground/70 leading-relaxed">
                        *Bezahlung nach der Behandlung vor Ort. Abrechnung nach GOÄ. Der genaue Umfang und die Kosten werden im Aufklärungsgespräch festgelegt.
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="px-5 pb-5">
                    <Link href={`/book/${group.firstCourse.id}`}>
                      <Button className="w-full">Termin buchen</Button>
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
