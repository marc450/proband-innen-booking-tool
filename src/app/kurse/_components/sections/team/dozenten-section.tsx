"use client";

import { useState } from "react";
import type { Dozent, TeamPageContent } from "@/content/kurse/team-types";
import { TYPO } from "../../typography";
import { PersonCard } from "./person-card";
import { DozentModal } from "./dozent-modal";

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
            <h2 className={`${TYPO.h2} text-black`}>{content.heading}</h2>
            {content.intro && (
              <p className={`${TYPO.bodyLead} mt-4`}>{content.intro}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {content.items.map((dozent) => {
              const hasCurriculum = Boolean(dozent.curriculum);
              return (
                <PersonCard
                  key={dozent.id}
                  name={dozent.name}
                  role={dozent.role}
                  imagePath={dozent.imagePath}
                  imageAlt={dozent.imageAlt}
                  shortBio={dozent.shortBio}
                  cta={{
                    label: content.ctaLabel,
                    disabledLabel: "Vita folgt",
                    disabled: !hasCurriculum,
                    onClick: () => setActiveDozent(dozent),
                  }}
                />
              );
            })}
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
