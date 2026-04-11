"use client";

import { useState } from "react";
import type { Person, PeopleSectionContent } from "@/content/kurse/team-types";
import { TYPO } from "../../typography";
import { PersonCard } from "./person-card";
import { DozentModal } from "./dozent-modal";

/**
 * Generic people grid used for both the main combined team section
 * (Dozent:innen + operations) and the Review-Board section.
 *
 * Pass `vitaLinkLabel` to enable the subtle "Vita ansehen →" link
 * on cards of people who have a curriculum. Omit it on the Review-Board
 * section so no one there gets a vita link.
 */
export function PeopleSection({
  content,
  vitaLinkLabel,
}: {
  content: PeopleSectionContent;
  vitaLinkLabel?: string;
}) {
  const [activePerson, setActivePerson] = useState<Person | null>(null);

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
            {content.items.map((person) => {
              const hasVita = Boolean(
                vitaLinkLabel && person.curriculum,
              );
              return (
                <PersonCard
                  key={person.id}
                  name={person.name}
                  role={person.role}
                  imagePath={person.imagePath}
                  imageAlt={person.imageAlt}
                  shortBio={person.shortBio}
                  vita={
                    hasVita && vitaLinkLabel
                      ? {
                          label: vitaLinkLabel,
                          onClick: () => setActivePerson(person),
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      </section>

      <DozentModal
        dozent={activePerson}
        onClose={() => setActivePerson(null)}
      />
    </>
  );
}
