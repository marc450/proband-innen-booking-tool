"use client";

import { useState } from "react";
import Image from "next/image";
import type { HomeCoursesContent, HomeCourseTile } from "@/content/kurse/home-types";
import { GroupInquiryDialog } from "../group-inquiry-dialog";
import { TYPO, titleCase } from "../../typography";

const BLUE = "#0066FF";
const CREAM = "#FAEBE1";
const CORAL = "#BF785E";

export function UnsereKurse({
  content,
  tone = "blue",
}: {
  content: HomeCoursesContent;
  /** `blue` = blue section on the home page, `cream` = standalone page on rose bg. */
  tone?: "blue" | "cream";
}) {
  const [groupOpen, setGroupOpen] = useState(false);

  const isCream = tone === "cream";
  const sectionBg = isCream ? CREAM : BLUE;
  const headingClass = isCream ? "text-black" : "text-white";

  return (
    <>
      <section
        id="unsere-kurse"
        className="py-20 md:py-28 scroll-mt-24 md:scroll-mt-28"
        style={{ backgroundColor: sectionBg }}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14">
            <h2 className={`${TYPO.h2} ${headingClass}`}>{content.heading}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
            {content.tiles.map((tile, i) => (
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

/** The subtitle shown under the title when audience text adds real variant
 *  info (e.g. "Periorale Zone"). The generic "Für … mediziner:innen" /
 *  "Für Kurseinsteiger:innen" texts are redundant with the pills so we hide
 *  them. */
function variantSubtitle(audience: string): string | null {
  const redundant = [
    "Für Humanmediziner:innen",
    "Für Zahnmediziner:innen",
    "Für Kurseinsteiger:innen",
    "Für fortgeschrittene Ärzt:innen",
    "Für private Kurse",
  ];
  return redundant.includes(audience) ? null : audience;
}

type CourseLevel = "grundkurs" | "aufbaukurs" | null;

function getLevel(kicker: string): CourseLevel {
  const k = kicker.toUpperCase();
  if (k === "GRUNDKURS") return "grundkurs";
  if (k === "AUFBAUKURS") return "aufbaukurs";
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
  const subtitle = variantSubtitle(tile.audience);

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

  // Level resolution order:
  //   1. `dbLevel` from course_templates.level (source of truth).
  //   2. Fallback: derive from the static kicker ("GRUNDKURS" etc.).
  const levelValue: "einsteiger" | "fortgeschritten" | null = tile.dbLevel === "einsteiger" || tile.dbLevel === "fortgeschritten"
    ? tile.dbLevel
    : getLevel(tile.kicker) === "grundkurs"
    ? "einsteiger"
    : getLevel(tile.kicker) === "aufbaukurs"
    ? "fortgeschritten"
    : null;

  const levelPill = isGroup
    ? null
    : levelValue === "einsteiger"
    ? { label: "Für Einsteiger:innen" }
    : levelValue === "fortgeschritten"
    ? { label: "Für Fortgeschrittene" }
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
        <h3 className={`${TYPO.h3} text-black`}>{fullTitle}</h3>

        {subtitle && (
          <p className={`${TYPO.bodySmall} mt-2`}>{subtitle}</p>
        )}

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

        {/* Description — matches the body text size used across the course page
            (Lernziele cards, FAQ answers, Inhalt chapters). */}
        <p className={`${TYPO.bodyCard} mt-4 mb-6 flex-1`}>
          {tile.description}
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
