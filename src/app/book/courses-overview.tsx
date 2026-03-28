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
          <h1 className="font-bold mb-4" style={{ fontFamily: "Roboto", fontSize: "3rem", fontWeight: "bold", letterSpacing: "0rem", lineHeight: 1.25, textTransform: "uppercase", color: "#000000" }}>
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

                <CardContent className="p-5 flex flex-col gap-3">
                  {/* Title + description */}
                  <div>
                    <h2 className="text-lg font-bold leading-tight">{group.firstCourse.treatment_title || group.title}</h2>
                    {group.firstCourse.service_description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.firstCourse.service_description}
                      </p>
                    )}
                  </div>

                  <hr className="border-border/40" />

                  {/* Details grid */}
                  {group.firstCourse.guide_price && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Richtpreis</p>
                      <p className="text-lg font-bold">EUR {group.firstCourse.guide_price.replace(/[€\s]/g, "")}</p>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="pt-3 pb-1">
                    <Link href={`/book/${group.firstCourse.id}`}>
                      <Button className="w-full">Termine anschauen</Button>
                    </Link>
                  </div>

                  {group.firstCourse.guide_price && (
                    <p className="text-[11px] text-muted-foreground/60 text-center">
                      *Bezahlung nach der Behandlung vor Ort. Abrechnung nach GOÄ.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
