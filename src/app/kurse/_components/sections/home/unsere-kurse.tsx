"use client";

import { useState } from "react";
import Image from "next/image";
import { Award } from "lucide-react";
import type { HomeCoursesContent, HomeCourseTile } from "@/content/kurse/home-types";
import { GroupInquiryDialog } from "../group-inquiry-dialog";
import { TYPO, titleCase } from "../../typography";

const BLUE = "#0066FF";
const CREAM = "#FAEBE1";
const CORAL = "#BF785E";

type LevelFilter = "alle" | "einsteiger" | "fortgeschritten";

const LEVEL_FILTERS: { value: LevelFilter; label: string }[] = [
  { value: "alle", label: "Alle Kurse" },
  { value: "einsteiger", label: "Für Einsteiger:innen" },
  { value: "fortgeschritten", label: "Für Fortgeschrittene" },
];

export function UnsereKurse({
  content,
  tone = "blue",
}: {
  content: HomeCoursesContent;
  /** `blue` = blue section on the home page, `cream` = standalone page on rose bg. */
  tone?: "blue" | "cream";
}) {
  const [groupOpen, setGroupOpen] = useState(false);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("alle");

  const isCream = tone === "cream";
  const sectionBg = isCream ? CREAM : BLUE;
  const headingClass = isCream ? "text-black" : "text-white";

  // Only offer the filter when at least one leveled course of each kind
  // exists, otherwise the control would just hide half the (single-level)
  // catalogue for no reason.
  const hasEinsteiger = content.tiles.some((t) => resolveLevel(t) === "einsteiger");
  const hasFortgeschritten = content.tiles.some(
    (t) => resolveLevel(t) === "fortgeschritten"
  );
  const showFilter = hasEinsteiger && hasFortgeschritten;

  // Group-inquiry tiles carry no level, so they stay visible under every
  // filter (they're a CTA card, not a leveled course).
  const visibleTiles = content.tiles.filter((tile) => {
    if (levelFilter === "alle" || tile.type === "group-inquiry") return true;
    return resolveLevel(tile) === levelFilter;
  });

  return (
    <>
      <section
        id="unsere-kurse"
        className="py-20 md:py-28 scroll-mt-24 md:scroll-mt-28"
        style={{ backgroundColor: sectionBg }}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-6 max-w-3xl mx-auto">
            <h2 className={`${TYPO.h2} ${headingClass}`}>{content.heading}</h2>
            {content.intro && (
              <p
                className={`${TYPO.bodyLead} mt-5 ${
                  isCream ? "text-black/75" : "text-white/85"
                }`}
              >
                {content.intro}
              </p>
            )}
          </div>

          {showFilter && (
            <div
              className="flex flex-wrap justify-center gap-2 mb-12"
              role="group"
              aria-label="Kurse nach Niveau filtern"
            >
              {LEVEL_FILTERS.map((f) => {
                const active = levelFilter === f.value;
                const activeClass = isCream
                  ? "bg-[#0066FF] text-white"
                  : "bg-white text-[#0066FF]";
                const inactiveClass = isCream
                  ? "bg-black/5 text-black/70 hover:bg-black/10"
                  : "bg-white/10 text-white hover:bg-white/20";
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setLevelFilter(f.value)}
                    aria-pressed={active}
                    className={`text-sm font-semibold rounded-full px-5 py-2.5 transition-colors ${
                      active ? activeClass : inactiveClass
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
            {visibleTiles.map((tile, i) => (
              <CourseTile
                key={`${tile.title}-${tile.audience}-${i}`}
                tile={tile}
                onGroupInquiry={() => setGroupOpen(true)}
              />
            ))}
          </div>
        </div>
      </section>

      <GroupInquiryDialog
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        ctaLabel="Jetzt Anfrage senden"
      />
    </>
  );
}

type CourseLevel = "grundkurs" | "aufbaukurs" | null;

function getLevel(kicker: string): CourseLevel {
  const k = kicker.toUpperCase();
  if (k === "GRUNDKURS") return "grundkurs";
  if (k === "AUFBAUKURS") return "aufbaukurs";
  return null;
}

// Level resolution order:
//   1. `dbLevel` from course_templates.level (source of truth).
//   2. Fallback: derive from the static kicker ("GRUNDKURS" etc.).
// Shared by the filter (parent) and the level pill (tile) so both agree.
function resolveLevel(
  tile: HomeCourseTile
): "einsteiger" | "fortgeschritten" | null {
  if (tile.dbLevel === "einsteiger" || tile.dbLevel === "fortgeschritten") {
    return tile.dbLevel;
  }
  const kickerLevel = getLevel(tile.kicker);
  if (kickerLevel === "grundkurs") return "einsteiger";
  if (kickerLevel === "aufbaukurs") return "fortgeschritten";
  return null;
}

function CourseTile({
  tile,
  onGroupInquiry,
}: {
  tile: HomeCourseTile;
  onGroupInquiry: () => void;
}) {
  const isGroup = tile.type === "group-inquiry";
  const isExternal = tile.href?.startsWith("http");

  // Title resolution order:
  //   1. `dbTitle` — when set, it comes from `course_templates.title`
  //      and the admin is the source of truth. Render verbatim (no
  //      titleCase — respect Marc's capitalisation), skipping the
  //      hardcoded kicker prepend.
  //   2. Otherwise merge kicker ("GRUNDKURS") + title ("BOTULINUM") into
  //      one line — e.g. "Grundkurs Botulinum".
  const fullTitle = tile.dbTitle
    ? tile.dbTitle
    : isGroup
    ? titleCase(tile.title)
    : tile.kicker
    ? `${titleCase(tile.kicker)} ${titleCase(tile.title)}`
    : titleCase(tile.title);

  // Audience resolution order:
  //   1. `dbAudience` from course_templates.audience (source of truth).
  //   2. Fallback: courseKey string-match on "zahnmedizin" (legacy).
  // "alle" renders no pill at all (course is relevant for everyone).
  const audienceValue =
    tile.dbAudience ??
    (tile.courseKey?.includes("zahnmedizin") ? "zahnmediziner" : "humanmediziner");

  const audiencePill = isGroup
    ? null
    : audienceValue === "alle"
    ? null
    : audienceValue === "zahnmediziner"
    ? { label: "Für Zahnmediziner:innen", bg: CORAL, text: "#FFFFFF" }
    : { label: "Für Humanmediziner:innen", bg: BLUE, text: "#FFFFFF" };

  const levelValue = resolveLevel(tile);

  const levelPill = isGroup
    ? null
    : levelValue === "einsteiger"
    ? { label: "Für Einsteiger:innen" }
    : levelValue === "fortgeschritten"
    ? { label: "Für Fortgeschrittene" }
    : null;

  // CME badge — mirrors the booking-widget CourseCard. Pending wins over
  // a numeric value; a bare number gets the unit suffix appended. The unit
  // defaults to "CME" but is "Fortbildungspunkte" for Zahnmedizin courses.
  const cmeUnit = tile.cmeUnit || "CME";
  const cmeText = isGroup
    ? null
    : tile.cmePending
    ? `${cmeUnit} beantragt`
    : tile.cme
    ? tile.cme.includes(cmeUnit) || /CME/i.test(tile.cme)
      ? tile.cme
      : `${tile.cme} ${cmeUnit}`
    : null;

  return (
    <article className="bg-white rounded-[10px] overflow-hidden flex flex-col group">
      {/* Image */}
      {tile.imagePath ? (
        <div className="relative aspect-[4/3] bg-black/5 overflow-hidden">
          <Image
            src={tile.imagePath}
            alt={tile.imageAlt ?? `${tile.title} ${tile.audience}`}
            fill
            quality={85}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {cmeText && (
            <div
              className="absolute top-4 right-4 z-10 bg-[#0066FF] text-white px-3 py-1.5 rounded-full flex items-center gap-1.5"
              style={{ boxShadow: "0 0 0 3px rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.15)" }}
            >
              <Award className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm font-bold whitespace-nowrap">{cmeText}</span>
            </div>
          )}
        </div>
      ) : (
        <div
          className="aspect-[4/3] flex items-center justify-center"
          style={{ backgroundColor: CORAL }}
          aria-hidden="true"
        >
          <span className="text-white/90 text-xs font-semibold tracking-[0.2em]">
            PRIVATE KURSE
          </span>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-col flex-1 p-6 md:p-8">
        {/* Title: slightly smaller than TYPO.h3 so all current course
            titles fit comfortably on one line. */}
        <h3 className="text-xl md:text-2xl font-bold tracking-wide leading-tight text-black text-balance">
          {fullTitle}
        </h3>

        {/* Audience + level pills */}
        {(audiencePill || levelPill) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-4">
            {audiencePill && (
              <span
                className="text-[11px] font-semibold tracking-wide rounded-full px-2.5 py-1"
                style={{ backgroundColor: audiencePill.bg, color: audiencePill.text }}
              >
                {audiencePill.label}
              </span>
            )}
            {levelPill && (
              <span className="text-[11px] font-semibold tracking-wide rounded-full px-2.5 py-1 bg-black/5 text-black/70">
                {levelPill.label}
              </span>
            )}
          </div>
        )}

        {/* Description — prefer the admin-edited `card_description` from
            course_templates; fall back to the static content string so the
            card isn't empty while Marc fills in each course. */}
        <p className={`${TYPO.bodyCard} mt-4 mb-6 flex-1`}>
          {tile.dbCardDescription || tile.description}
        </p>

        {/* CTA */}
        <div>
          {isGroup ? (
            <button
              type="button"
              onClick={onGroupInquiry}
              className="w-full text-sm md:text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3 transition-colors"
            >
              {tile.ctaLabel}
            </button>
          ) : (
            <a
              href={tile.href}
              {...(isExternal
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="block text-center w-full text-sm md:text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3 transition-colors"
            >
              Kurs entdecken →
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
