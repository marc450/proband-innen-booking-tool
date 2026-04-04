"use client";

import { useEffect } from "react";
import { AvailableSlot, Course } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Props {
  courses: Course[];
  slots: AvailableSlot[];
}

interface CourseGroup {
  title: string;
  description: string | null;
  firstCourse: Course;
}

export function PrivatCoursesOverview({ courses, slots }: Props) {
  useEffect(() => {
    const sendHeight = () => {
      window.parent.postMessage({ type: "ephia-resize", height: document.body.scrollHeight }, "*");
    };
    sendHeight();
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  const groupedMap = new Map<string, CourseGroup>();

  for (const course of courses) {
    const courseSlots = slots.filter((s) => s.course_id === course.id);
    if (courseSlots.length === 0) continue;

    if (!groupedMap.has(course.title)) {
      groupedMap.set(course.title, {
        title: course.title,
        description: course.description,
        firstCourse: course,
      });
    } else {
      const existing = groupedMap.get(course.title)!;
      if (!existing.firstCourse.image_url && course.image_url) {
        existing.firstCourse = course;
      }
    }
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
          <p className="max-w-xl mx-auto" style={{ fontFamily: "Roboto", fontWeight: "normal", fontSize: "1.0625rem", letterSpacing: "0rem", lineHeight: 1.65, color: "#000000" }}>
            Bitte wähle den Behandlungstermin in dem Kurs, an dem Deine behandelnde Ärzt:in teilnimmt.
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
                  <div>
                    <h2 className="text-lg font-bold leading-tight">{group.firstCourse.treatment_title || group.title}</h2>
                    {group.firstCourse.service_description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.firstCourse.service_description}
                      </p>
                    )}
                  </div>

                  <hr className="border-border/40" />


                  <div className="pt-3 pb-1">
                    <Link href={`/book/privat/${group.firstCourse.id}`}>
                      <Button className="w-full">Termine anschauen</Button>
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
