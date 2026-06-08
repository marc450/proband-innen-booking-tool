"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, ImageIcon } from "lucide-react";
import type { AvailableSlot, Course } from "@/lib/types";
import { PICKER_INDICATIONS } from "@/lib/indications";
import { TYPO } from "../typography";

interface TreatmentListProps {
  courses: Course[];
  slots: AvailableSlot[];
  // When present, a standalone Masseter card is prepended to the grid.
  // Computed in werde-proband-in/page.tsx from the combined masseter
  // capacity (general Therap. Indikationen seats + reserved Botulinum
  // seats). null when no masseter capacity is bookable, so the card hides.
  masseterCard:
    | { courseId: string; guidePriceCents: number | null; imageUrl: string | null }
    | null;
}

// Static content for the standalone Masseter card. Price and image come
// from the Therap. Indikationen course (passed in via masseterCard) so they
// stay in sync; only the masseter-specific copy lives here. Mirrors the
// "TEMPORARY hardcoded" pattern of TEMP_ZONES_BY_TITLE above.
const MASSETER_CARD = {
  title: "__masseter__",
  treatmentTitle: "Gesichtsverschmälerung / Masseter / Bruxismus",
  // Dedicated card image, stored in the public Supabase `treatment-images`
  // bucket (next.config remotePatterns already allows that host + path).
  // To swap it, overwrite this file in the bucket or change the URL here.
  imageUrl:
    "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/treatment-images/Ephia_kathrinschiebler20%20(1).png",
  serviceDescription:
    "Im Rahmen dieses Kurses kannst Du eine Behandlung des Musculus masseter mit Botulinum durch eine:n approbierte:n Ärzt:in erhalten. Behandelt werden, je nach Ausgangssituation, Beschwerden wie Bruxismus (Zähneknirschen) und Kieferpressen oder eine Verschmälerung der Gesichtskontur. Ob eine Behandlung medizinisch sinnvoll ist, wird im Aufklärungsgespräch mit unseren Dozent:innen geprüft und in einem individuellen Behandlungsplan festgehalten. Das Ergebnis soll natürlich und harmonisch wirken. In vielen Praxen liegen die Preise für eine entsprechende Behandlung deutlich über unserem Richtpreis.",
  zones: {
    label: "Behandelbare Indikationen",
    items: [
      "Kieferbreite reduzieren (Gesichtsverschmälerung)",
      "Bruxismus / Zähneknirschen",
      "Kieferpressen",
    ],
  },
};

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

// TEMPORARY: hardcoded zone / indication lists per treatment card.
// Once the structure is stable this moves to course_templates columns
// (label + treatments[]) and gets edited via the dashboard template
// manager. The `label` switches the small header above the list so
// aesthetic and therapeutic cards can use the right vocabulary.
const TEMP_ZONES_BY_TITLE: Record<
  string,
  { label: string; items: string[] }
> = {
  "Behandlung mimischer Falten mit Botulinum": {
    label: "Behandelbare Zonen",
    items: [
      "Glabella (Zornesfalte)",
      "Stirn (Querfalten)",
      "Krähenfüße",
      "Bunny Lines",
      "Hals (Platysmabänder)",
    ],
  },
  "Behandlung therapeutischer Indikationen": {
    label: "Behandelbare Indikationen",
    // Derived from PICKER_INDICATIONS in src/lib/indications.ts so the
    // bullets on the landing card always mirror what the slot picker
    // offers one step later. Masseter is excluded here because it has its
    // own standalone card (see MASSETER_CARD below); the picker no longer
    // lists it either, so the two stay in sync.
    items: PICKER_INDICATIONS.map((i) => i.label),
  },
  "Behandlung des Gesichts mit Dermalfiller": {
    label: "Behandelbare Zonen",
    items: [
      "Wangen",
      "Kinn",
      "Nasolabialfalten",
    ],
  },
};

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
  // Optional overrides for synthetic cards (e.g. Masseter) that don't map
  // 1:1 to a course row: a deep-link CTA target and a custom zone list.
  href?: string;
  zones?: { label: string; items: string[] };
  // CSS object-position for the cover image. Defaults to center; the
  // Masseter portrait is anchored higher so the top of the head isn't
  // cropped by the 16:9 frame.
  imageObjectPosition?: string;
}

/**
 * Behandlungsangebote auf der Proband:innen-Seite. Zieht die gleichen
 * Datensätze wie `/book` (siehe src/app/book/page.tsx), rendert sie aber
 * im EPHIA /kurse Stil: cremefarbiger Hintergrund, rounded-[10px] Tiles,
 * keine Ränder. Die CTA führt zur bestehenden Slot-Auswahl unter
 * `/book/{courseId}`, sodass der Buchungs-Funnel unverändert bleibt.
 */
export function TreatmentList({ courses, slots, masseterCard }: TreatmentListProps) {
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

    const result = Array.from(groupedMap.values());

    // Prepend the standalone Masseter card so it leads the grid (masseter
    // is the highest-demand treatment). It deep-links into the Therap.
    // Indikationen flow with the indication pre-selected.
    if (masseterCard) {
      result.unshift({
        title: MASSETER_CARD.title,
        firstCourse: {
          id: masseterCard.courseId,
          title: MASSETER_CARD.treatmentTitle,
          treatment_title: MASSETER_CARD.treatmentTitle,
          service_description: MASSETER_CARD.serviceDescription,
          guide_price_cents: masseterCard.guidePriceCents,
          image_url: MASSETER_CARD.imageUrl ?? masseterCard.imageUrl,
        } as Course,
        totalSlots: 1,
        category: "botulinum",
        href: `/book/${masseterCard.courseId}?indication=masseter`,
        zones: MASSETER_CARD.zones,
        imageObjectPosition: "center 0%",
      });
    }

    return result;
  }, [courses, slots, masseterCard]);

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
      <div className="max-w-7xl mx-auto px-5 md:px-8">
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
                  <div className="relative aspect-[16/9] bg-black/5 overflow-hidden">
                    <Image
                      src={group.firstCourse.image_url}
                      alt={
                        group.firstCourse.treatment_title ||
                        group.firstCourse.title
                      }
                      fill
                      quality={85}
                      sizes="(min-width: 768px) 50vw, 100vw"
                      style={
                        group.imageObjectPosition
                          ? { objectPosition: group.imageObjectPosition }
                          : undefined
                      }
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                ) : (
                  <div
                    className="aspect-[16/9] flex items-center justify-center bg-black/5"
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
                    <p className={`${TYPO.bodyCard} mt-4`}>
                      {group.firstCourse.service_description}
                    </p>
                  )}

                  {(() => {
                    const displayTitle =
                      group.firstCourse.treatment_title || group.firstCourse.title;
                    const zones = group.zones ?? TEMP_ZONES_BY_TITLE[displayTitle];
                    if (!zones || zones.items.length === 0) return null;
                    return (
                      <div className="mt-5">
                        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-black/55 mb-2">
                          {zones.label}
                        </p>
                        <ul className="space-y-1.5">
                          {zones.items.map((z) => (
                            <li
                              key={z}
                              className="flex items-start gap-2 text-sm md:text-base text-black/80"
                            >
                              <Check
                                className="w-4 h-4 mt-1 text-[#0066FF] shrink-0"
                                strokeWidth={2.5}
                                aria-hidden="true"
                              />
                              <span>{z}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}

                  {/* Absorbs remaining vertical space so price + button
                      pin to the bottom regardless of how much content
                      sits above. */}
                  <div className="flex-1" />

                  {group.firstCourse.guide_price_cents != null && (
                    <div className="mt-5 mb-6">
                      <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-black/55">
                        Richtpreis
                      </p>
                      <p className="text-2xl font-bold text-black mt-0.5">
                        EUR {(group.firstCourse.guide_price_cents / 100).toLocaleString("de-DE")}
                      </p>
                    </div>
                  )}

                  <div>
                    <Link
                      href={group.href ?? `/book/${group.firstCourse.id}`}
                      className="inline-flex items-center justify-center gap-2 w-full text-sm md:text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3 transition-colors"
                    >
                      <span>Termine anschauen</span>
                      <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
                    </Link>

                    {group.firstCourse.guide_price_cents != null && (
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
