import type { PeopleSectionContent } from "@/content/kurse/team-types";
import { personHasProfile } from "@/content/kurse/team";
import { TYPO } from "../../typography";
import { PersonCard } from "./person-card";

/**
 * Generic people grid used for both the main combined team section
 * (Dozent:innen + operations) and the Review-Board section.
 *
 * People who have a dedicated profile page (Dozent:innen + Review-Board,
 * see `getProfilePeople`) get a subtle "Vita ansehen →" link and the
 * whole card becomes a crawlable anchor to `/team/<id>`. Operations /
 * founders without a profile page render as static cards.
 *
 * `vitaLinkLabel` overrides the link label on the main team section
 * ("Vita ansehen"); the Review-Board section falls back to
 * "Profil ansehen".
 */
export function PeopleSection({
  content,
  vitaLinkLabel,
}: {
  content: PeopleSectionContent;
  vitaLinkLabel?: string;
}) {
  const linkLabel = vitaLinkLabel ?? "Profil ansehen";

  return (
    <section
      className={`bg-[#FAEBE1] ${
        content.heading ? "py-20 md:py-28" : "pt-6 md:pt-10 pb-20 md:pb-28"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        {content.heading && (
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <h2 className={`${TYPO.h2} text-black`}>{content.heading}</h2>
            {content.intro && (
              <p className={`${TYPO.bodyLead} mt-4`}>{content.intro}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {content.items.map((person) => {
            const hasProfile = personHasProfile(person);
            return (
              <PersonCard
                key={person.id}
                name={person.name}
                role={person.role}
                imagePath={person.imagePath}
                imageAlt={person.imageAlt}
                shortBio={person.shortBio}
                vita={
                  hasProfile
                    ? { label: linkLabel, href: `/team/${person.id}` }
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
