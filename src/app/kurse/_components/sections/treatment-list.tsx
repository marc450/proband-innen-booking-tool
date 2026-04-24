"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ImageIcon } from "lucide-react";
import type { AvailableSlot, Course } from "@/lib/types";
import { TYPO } from "../typography";

interface TreatmentListProps {
  courses: Course[];
  slots: AvailableSlot[];
}

type TreatmentCategory =
  | "botulinum"
  | "dermalfiller"
  | "biostimulation"
  | "hautpflege"
  | "sonstiges";

const CATEGORY_LABELS: Record<TreatmentCategory, string> = {
  botulinum: "Botulinum",
  dermalfiller: "Dermalfiller",
  biostimulation: "Biostimulation",
  hautpflege: "Hautpflege",
  sonstiges: "Sonstiges",
};

// Pill styling per category, used on the white treatment cards. Same color
// family as the admin dashboard accent bars so an operator recognises them.
const CATEGORY_PILL: Record<TreatmentCategory, string> = {
  botulinum: "bg-indigo-50 text-indigo-700",
  dermalfiller: "bg-pink-50 text-pink-700",
  biostimulation: "bg-teal-50 text-teal-700",
  hautpflege: "bg-amber-50 text-amber-700",
  sonstiges: "bg-gray-100 text-gray-700",
};

const CATEGORY_ORDER: TreatmentCategory[] = [
  "botulinum",
  "dermalfiller",
  "biostimulation",
  "hautpflege",
  "sonstiges",
];

function classifyTreatment(
  treatmentTitle: string | null,
  title: string,
): TreatmentCategory {
  const key = `${treatmentTitle || ""} ${title}`.toLowerCase();
  if (key.includes("botulinum")) return "botulinum";
  if (key.includes("dermalfiller") || key.includes("filler")) return "dermalfiller";
  if (key.includes("biostimulation") || key.includes("skinbooster")) return "biostimulation";
  if (key.includes("hautpflege") || key.includes("skincare")) return "hautpflege";
  return "sonstiges";
}

interface TreatmentGroup {
  title: string;
  firstCourse: Course;
  totalSlots: number;
  category: TreatmentCategory;
}

/**
 * Behandlungsangebote auf der Proband:innen-Seite. Zieht die gleichen
 * Datensätze wie `/book` (siehe src/app/book/page.tsx), rendert sie aber
 * im EPHIA /kurse Stil: cremefarbiger Hintergrund, rounded-[10px] Tiles,
 * keine Ränder. Die CTA führt zur bestehenden Slot-Auswahl unter
 * `/book/{courseId}`, sodass der Buchungs-Funnel unverändert bleibt.
 */
export function TreatmentList({ courses, slots }: TreatmentListProps) {
  const groups = useMemo(() => {
    const groupedMap = new Map<string, TreatmentGroup>();

    for (const course of courses) {
      const courseSlots = slots.filter((s) => s.course_id === course.id);
      if (courseSlots.length === 0) continue;

      if (!groupedMap.has(course.title)) {
        groupedMap.set(course.title, {
          title: course.title,
          firstCourse: course,
          totalSlots: 0,
          category: classifyTreatment(course.treatment_title, course.title),
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

    return Array.from(groupedMap.values());
  }, [courses, slots]);

  const availableCategories = useMemo(() => {
    const present = new Set(groups.map((g) => g.category));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [groups]);

  const [selectedCategory, setSelectedCategory] = useState<
    TreatmentCategory | "all"
  >("all");

  const visibleGroups = useMemo(() => {
    if (selectedCategory === "all") return groups;
    return groups.filter((g) => g.category === selectedCategory);
  }, [groups, selectedCategory]);

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

        {availableCategories.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 md:mb-10">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              aria-pressed={selectedCategory === "all"}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                selectedCategory === "all"
                  ? "bg-white text-[#0066FF]"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Alle
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                aria-pressed={selectedCategory === cat}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  selectedCategory === cat
                    ? "bg-white text-[#0066FF]"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        )}

        {groups.length === 0 ? (
          <div className="bg-white rounded-[10px] p-10 md:p-12 text-center">
            <p className="text-base md:text-lg text-black/70">
              Derzeit sind keine Kurse mit verfügbaren Terminen vorhanden. Schau
              bald wieder vorbei.
            </p>
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className="bg-white rounded-[10px] p-10 md:p-12 text-center">
            <p className="text-base md:text-lg text-black/70">
              Keine Termine in dieser Kategorie verfügbar. Schau bei einer
              anderen Kategorie oder bald wieder vorbei.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {visibleGroups.map((group) => (
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
                  <span
                    className={`self-start inline-flex items-center text-[11px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 mb-3 ${CATEGORY_PILL[group.category]}`}
                  >
                    {CATEGORY_LABELS[group.category]}
                  </span>
                  <h3 className="text-lg md:text-xl font-bold tracking-wide leading-tight text-black xl:whitespace-nowrap xl:overflow-hidden xl:text-ellipsis">
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
