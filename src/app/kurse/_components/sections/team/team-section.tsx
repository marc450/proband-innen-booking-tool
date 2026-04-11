import type { TeamSectionContent } from "@/content/kurse/team-types";
import { TYPO } from "../../typography";
import { PersonCard } from "./person-card";

/**
 * Generic people grid — used for both `Unser Team` (operations)
 * and `Unser Review-Board`. Reuses the unified `PersonCard` so the
 * visual treatment is identical to the Dozent:innen grid. The only
 * difference is that these cards don't have a "Vita ansehen" button.
 */
export function TeamSection({ content }: { content: TeamSectionContent }) {
  return (
    <section className="bg-[#FAEBE1] py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <h2 className={`${TYPO.h2} text-black`}>{content.heading}</h2>
          {content.intro && (
            <p className={`${TYPO.bodyLead} mt-4`}>{content.intro}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {content.items.map((member) => (
            <PersonCard
              key={member.name}
              name={member.name}
              role={member.role}
              imagePath={member.imagePath}
              imageAlt={member.imageAlt}
              shortBio={member.shortBio}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
