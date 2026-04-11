"use client";

import { useEffect } from "react";
import { AvailableSlot, Course } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ImageIcon } from "lucide-react";
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
            {groups.map((group) => (
              <article
                key={group.title}
                className="bg-white rounded-[10px] overflow-hidden flex flex-col group"
              >
                {group.firstCourse.image_url ? (
                  <div className="relative aspect-[4/3] bg-black/5 overflow-hidden">
                    <Image
                      src={group.firstCourse.image_url}
                      alt={group.firstCourse.treatment_title || group.title}
                      fill
                      quality={85}
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      priority
                    />
                  </div>
                ) : (
                  <div
                    className="aspect-[4/3] flex items-center justify-center bg-black/5"
                    aria-hidden="true"
                  >
                    <ImageIcon className="w-12 h-12 text-black/20" />
                  </div>
                )}

                <div className="flex flex-col flex-1 p-6 md:p-8">
                  <h2 className="text-xl md:text-2xl font-bold tracking-wide leading-tight text-black text-balance">
                    {group.firstCourse.treatment_title || group.title}
                  </h2>

                  {group.firstCourse.service_description && (
                    <p className="text-sm md:text-base text-black/75 leading-relaxed mt-4 flex-1">
                      {group.firstCourse.service_description}
                    </p>
                  )}

                  {group.firstCourse.guide_price && (
                    <div className="mt-5 mb-6">
                      <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-black/55">
                        Richtpreis
                      </p>
                      <p className="text-2xl font-bold text-black mt-0.5">
                        EUR {group.firstCourse.guide_price.replace(/[€\s]/g, "")}
                      </p>
                    </div>
                  )}

                  <div>
                    <Link
                      href={`/book/${group.firstCourse.id}`}
                      className="inline-flex items-center justify-center gap-2 w-full text-sm md:text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3 transition-colors"
                    >
                      <span>Termine anschauen</span>
                      <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
                    </Link>

                    {group.firstCourse.guide_price && (
                      <p className="text-[11px] text-black/50 text-center mt-3">
                        *Bezahlung nach der Behandlung vor Ort. Abrechnung nach GOÄ.
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
