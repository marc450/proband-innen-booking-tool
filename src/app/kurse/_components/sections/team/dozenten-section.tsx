"use client";

import { useState } from "react";
import Image from "next/image";
import type { Dozent, TeamPageContent } from "@/content/kurse/team-types";
import { TYPO } from "../../typography";
import { SectionEyebrow } from "../../section-eyebrow";
import { DozentModal } from "./dozent-modal";

const CORAL = "#BF785E";

export function DozentenSection({
  content,
}: {
  content: TeamPageContent["dozenten"];
}) {
  const [activeDozent, setActiveDozent] = useState<Dozent | null>(null);

  return (
    <>
      <section className="bg-[#FAEBE1] py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            {content.eyebrow && <SectionEyebrow>{content.eyebrow}</SectionEyebrow>}
            <h2 className={`${TYPO.h2} text-black`}>{content.heading}</h2>
            {content.intro && (
              <p className={`${TYPO.bodyLead} mt-4`}>{content.intro}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {content.items.map((dozent) => (
              <DozentCard
                key={dozent.id}
                dozent={dozent}
                ctaLabel={content.ctaLabel}
                onOpen={() => setActiveDozent(dozent)}
              />
            ))}
          </div>
        </div>
      </section>

      <DozentModal
        dozent={activeDozent}
        onClose={() => setActiveDozent(null)}
      />
    </>
  );
}

function DozentCard({
  dozent,
  ctaLabel,
  onOpen,
}: {
  dozent: Dozent;
  ctaLabel: string;
  onOpen: () => void;
}) {
  const hasCurriculum = Boolean(dozent.curriculum);

  return (
    <article className="bg-white rounded-[10px] overflow-hidden flex flex-col group">
      {dozent.imagePath ? (
        <div className="relative aspect-[4/5] bg-black/5 overflow-hidden">
          <Image
            src={dozent.imagePath}
            alt={dozent.imageAlt ?? dozent.name}
            fill
            quality={85}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      ) : (
        <div
          className="aspect-[4/5] flex items-center justify-center"
          style={{ backgroundColor: CORAL }}
          aria-hidden="true"
        >
          <span className="text-white/90 text-xs font-semibold tracking-[0.2em]">
            EPHIA
          </span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-6 md:p-7">
        <h3 className={`${TYPO.h3} text-black`}>{dozent.name}</h3>
        <p className="mt-1 text-sm md:text-base font-semibold text-[#0066FF]">
          {dozent.role}
        </p>

        <p className={`${TYPO.bodyCard} mt-4 mb-6 flex-1`}>{dozent.shortBio}</p>

        <div>
          <button
            type="button"
            onClick={onOpen}
            disabled={!hasCurriculum}
            className="w-full text-sm md:text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {hasCurriculum ? ctaLabel : "Vita folgt"}
          </button>
        </div>
      </div>
    </article>
  );
}
