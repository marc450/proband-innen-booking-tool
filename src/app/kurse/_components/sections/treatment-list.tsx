import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageIcon } from "lucide-react";
import type { AvailableSlot, Course } from "@/lib/types";
import { TYPO } from "../typography";

interface TreatmentListProps {
  courses: Course[];
  slots: AvailableSlot[];
}

interface TreatmentGroup {
  title: string;
  firstCourse: Course;
  totalSlots: number;
}

/**
 * Behandlungsangebote auf der Proband:innen-Seite. Zieht die gleichen
 * Datensätze wie `/book` (siehe src/app/book/page.tsx), rendert sie aber
 * im EPHIA /kurse Stil: cremefarbiger Hintergrund, rounded-[10px] Tiles,
 * keine Ränder. Die CTA führt zur bestehenden Slot-Auswahl unter
 * `/book/{courseId}`, sodass der Buchungs-Funnel unverändert bleibt.
 */
export function TreatmentList({ courses, slots }: TreatmentListProps) {
  const groupedMap = new Map<string, TreatmentGroup>();

  for (const course of courses) {
    const courseSlots = slots.filter((s) => s.course_id === course.id);
    if (courseSlots.length === 0) continue;

    if (!groupedMap.has(course.title)) {
      groupedMap.set(course.title, {
        title: course.title,
        firstCourse: course,
        totalSlots: 0,
      });
    } else {
      // Bevorzuge einen Eintrag, der bereits ein Bild hat
      const existing = groupedMap.get(course.title)!;
      if (!existing.firstCourse.image_url && course.image_url) {
        existing.firstCourse = course;
      }
    }

    groupedMap.get(course.title)!.totalSlots += courseSlots.length;
  }

  const groups = Array.from(groupedMap.values());

  return (
    <section
      id="behandlungen"
      className="bg-[#0066FF] py-16 md:py-20 scroll-mt-20"
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="text-center mb-12 md:mb-14 max-w-2xl mx-auto">
          <h2 className={`${TYPO.h2} text-white`}>Unsere Behandlungen</h2>
          <p className={`${TYPO.bodyLead} mt-4 text-white/85`}>
            Wähle Dein gewünschtes Behandlungsangebot und buche Deinen Termin
            als Proband:in in einem unserer ästhetischen Schulungskurse.
          </p>
        </div>

        {groups.length === 0 ? (
          <div className="bg-white rounded-[10px] p-10 md:p-12 text-center">
            <p className="text-base md:text-lg text-black/70">
              Derzeit sind keine Kurse mit verfügbaren Terminen vorhanden. Schau
              bald wieder vorbei.
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
                      alt={
                        group.firstCourse.treatment_title ||
                        group.firstCourse.title
                      }
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
                  <h3 className="text-lg md:text-xl font-bold tracking-wide leading-tight text-black whitespace-nowrap overflow-hidden text-ellipsis">
                    {group.firstCourse.treatment_title || group.firstCourse.title}
                  </h3>

                  {group.firstCourse.service_description && (
                    <p className={`${TYPO.bodyCard} mt-4 flex-1`}>
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
                        *Bezahlung nach der Behandlung vor Ort. Abrechnung nach
                        GOÄ.
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
