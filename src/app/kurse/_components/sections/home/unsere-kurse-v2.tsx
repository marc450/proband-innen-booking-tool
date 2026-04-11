"use client";

import { useState } from "react";
import Image from "next/image";
import type { HomeCoursesContent, HomeCourseTile } from "@/content/kurse/home-types";
import { GroupInquiryDialog } from "../group-inquiry-dialog";

const BLUE = "#0066FF";
const CORAL = "#BF785E";

export type CourseFormats = {
  online: boolean;
  praxis: boolean;
  kombi: boolean;
  /** Lowest gross price across the available formats, in EUR */
  fromPrice: number | null;
};

export type HomeCoursesV2Content = HomeCoursesContent & {
  formatsByKey?: Record<string, CourseFormats>;
};

export function UnsereKurseV2({ content }: { content: HomeCoursesV2Content }) {
  const [groupOpen, setGroupOpen] = useState(false);

  return (
    <>
      <section
        id="unsere-kurse-v2"
        className="py-20 md:py-28 scroll-mt-24 md:scroll-mt-28"
        style={{ backgroundColor: BLUE }}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-wide text-white mb-4">
              {content.heading}
            </h2>
            <p className="text-white/90 max-w-2xl mx-auto text-base md:text-lg">
              {content.intro}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {content.tiles.map((tile, i) => {
              const formats = tile.courseKey
                ? content.formatsByKey?.[tile.courseKey]
                : undefined;
              return (
                <CourseTileV2
                  key={`${tile.title}-${tile.audience}-${i}`}
                  tile={tile}
                  formats={formats}
                  onGroupInquiry={() => setGroupOpen(true)}
                />
              );
            })}
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

function CourseTileV2({
  tile,
  formats,
  onGroupInquiry,
}: {
  tile: HomeCourseTile;
  formats?: CourseFormats;
  onGroupInquiry: () => void;
}) {
  const isGroup = tile.type === "group-inquiry";
  const isExternal = tile.href?.startsWith("http");
  const uppercaseTitle = tile.title.toUpperCase();
  const subtitle = variantSubtitle(tile.audience);

  const level = getLevel(tile.kicker);
  const isZahn = tile.courseKey?.includes("zahnmedizin") ?? false;

  const kickerBg = level === "aufbaukurs" ? CORAL : level === "grundkurs" ? BLUE : "rgba(0,0,0,0.6)";

  // Audience pill (Human/Zahn). Skip for the group-inquiry tile.
  const audiencePill = isGroup
    ? null
    : isZahn
    ? { label: "Zahnmediziner:innen", bg: CORAL, text: "#FFFFFF" }
    : { label: "Humanmediziner:innen", bg: BLUE, text: "#FFFFFF" };

  // Level pill (Einsteiger/Fortgeschritten).
  const levelPill = isGroup
    ? null
    : level === "grundkurs"
    ? { label: "Einsteiger:innen" }
    : level === "aufbaukurs"
    ? { label: "Fortgeschrittene" }
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
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute top-3 left-3">
            <span
              className="inline-block text-[10px] md:text-xs font-semibold tracking-[0.18em] text-white rounded-full px-2.5 py-1 uppercase"
              style={{ backgroundColor: kickerBg }}
            >
              {tile.kicker}
            </span>
          </div>
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
      <div className="flex flex-col flex-1 p-5 md:p-6">
        {/* Title row: title + ab price */}
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-xl md:text-2xl font-bold tracking-wide text-black leading-tight">
            {uppercaseTitle}
          </h3>
          {formats?.fromPrice ? (
            <div className="text-sm md:text-base font-bold text-black whitespace-nowrap">
              ab {formats.fromPrice} €
            </div>
          ) : null}
        </div>

        {/* Variant subtitle (e.g. "Periorale Zone") */}
        {subtitle && (
          <div className="text-sm font-semibold text-black/60 mt-1">
            {subtitle}
          </div>
        )}

        {/* Audience + level pills */}
        {(audiencePill || levelPill) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
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

        {/* Description (max 5 lines) */}
        <p className="text-sm text-black/70 leading-relaxed mt-3 mb-5 flex-1 line-clamp-5">
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
