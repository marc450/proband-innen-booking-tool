import Image from "next/image";
import type { TeamSectionContent } from "@/content/kurse/team-types";
import { TYPO } from "../../typography";
import { SectionEyebrow } from "../../section-eyebrow";

const CORAL = "#BF785E";

/**
 * Generic, smaller people grid — used for both `Unser Team` (operations)
 * and `Unser Review-Board`. Cards are compact (circular portrait) because
 * these people don't have a curriculum modal to open.
 *
 * `tone="cream"` renders on the page background. `tone="white"` renders
 * on a white section so the Review-Board stands apart visually from the
 * operations team.
 */
export function TeamSection({
  content,
  tone = "cream",
}: {
  content: TeamSectionContent;
  tone?: "cream" | "white";
}) {
  const sectionBg = tone === "white" ? "#FFFFFF" : "#FAEBE1";

  return (
    <section
      className="py-20 md:py-24"
      style={{ backgroundColor: sectionBg }}
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="text-center mb-14 max-w-3xl mx-auto">
          {content.eyebrow && <SectionEyebrow>{content.eyebrow}</SectionEyebrow>}
          <h2 className={`${TYPO.h2} text-black`}>{content.heading}</h2>
          {content.intro && (
            <p className={`${TYPO.bodyLead} mt-4`}>{content.intro}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {content.items.map((member) => (
            <article
              key={member.name}
              className="flex flex-col items-center text-center"
            >
              {member.imagePath ? (
                <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden bg-black/5">
                  <Image
                    src={member.imagePath}
                    alt={member.imageAlt ?? member.name}
                    fill
                    quality={85}
                    sizes="176px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  className="w-36 h-36 md:w-44 md:h-44 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: CORAL }}
                  aria-hidden="true"
                >
                  <span className="text-white/90 text-xs font-semibold tracking-[0.2em]">
                    EPHIA
                  </span>
                </div>
              )}

              <h3 className="mt-5 text-xl md:text-2xl font-bold text-black tracking-wide">
                {member.name}
              </h3>
              <p className="mt-1 text-sm md:text-base font-semibold text-[#0066FF]">
                {member.role}
              </p>
              {member.shortBio && (
                <p className={`${TYPO.bodyCard} mt-3 max-w-sm`}>
                  {member.shortBio}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
