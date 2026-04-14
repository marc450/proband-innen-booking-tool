"use client";

import { useEffect } from "react";
import { AvailableSlot, Course } from "@/lib/types";
import { ArrowRight, ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Props {
  courses: Course[];
  slots: AvailableSlot[];
}

interface CourseGroup {
  title: string;
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
    <div className="min-h-screen bg-[#FAEBE1]">
      <header className="border-b border-black/10 bg-[#FAEBE1] h-[55px] flex items-center">
        <div className="max-w-5xl mx-auto px-4 w-full">
          <a href="https://ephia.de" target="_blank" rel="noopener noreferrer" className="inline-block">
            <img src="/logo.svg" alt="EPHIA" style={{ width: "203px", height: "auto" }} />
          </a>
        </div>
      </header>

      <main className="bg-[#0066FF] py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-14 max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold tracking-wide uppercase text-white">
              Behandlungstermin buchen
            </h1>
            <p className="text-base md:text-lg mt-4 text-white/85 leading-relaxed">
              Bitte wähle den Behandlungstermin in dem Kurs, an dem Deine behandelnde Ärzt:in teilnimmt.
            </p>
          </div>

          {groups.length === 0 ? (
            <div className="bg-white rounded-[10px] p-10 md:p-12 text-center">
              <p className="text-base md:text-lg text-black/70">
                Derzeit sind keine Kurse mit verfügbaren Terminen vorhanden.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
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
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
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
                    <h3 className="text-lg md:text-xl font-bold tracking-wide leading-tight text-black">
                      {group.firstCourse.treatment_title || group.title}
                    </h3>

                    {group.firstCourse.service_description && (
                      <p className="text-sm md:text-base text-black/75 leading-relaxed mt-4 flex-1">
                        {group.firstCourse.service_description}
                      </p>
                    )}

                    <div className="mt-6">
                      <Link
                        href={`/book/privat/${group.firstCourse.id}`}
                        className="inline-flex items-center justify-center gap-2 w-full text-sm md:text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3 transition-colors"
                      >
                        <span>Termine anschauen</span>
                        <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
