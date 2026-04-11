import type { Metadata } from "next";
import { teamContent } from "@/content/kurse/team";
import type { Person } from "@/content/kurse/team-types";
import { TYPO } from "../_components/typography";
import { PeopleSection } from "../_components/sections/team/people-section";
import { TeamCTA } from "../_components/sections/team/team-cta";

// Rendered dynamically so every request produces a fresh random order
// of team members (founders are mixed in with everyone else instead of
// always sitting at the top). Review board stays in its fixed order.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: teamContent.meta.title,
  description: teamContent.meta.description,
  alternates: { canonical: "https://kurse.ephia.de/kurse/team" },
};

/** Fisher-Yates shuffle — returns a new array, doesn't mutate the input. */
function shuffle<T>(input: readonly T[]): T[] {
  const out = [...input];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function TeamPage() {
  // Shuffle per request on the server so every visitor gets a
  // different mix. Using server-side shuffle (rather than client
  // useEffect) avoids hydration mismatches and flash-of-unshuffled.
  const shuffledTeam = {
    ...teamContent.team,
    items: shuffle<Person>(teamContent.team.items),
  };

  return (
    <>
      {/* Hero */}
      <section className="bg-[#FAEBE1] pt-16 md:pt-24 pb-10 md:pb-14">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <h1 className={`${TYPO.h1} text-black`}>
            {teamContent.hero.heading}
          </h1>
          <p className={`${TYPO.bodyLead} mt-6`}>{teamContent.hero.intro}</p>
        </div>
      </section>

      {/* Combined team (Dozent:innen + Operations), randomised per request.
          Cards of people with a curriculum get a subtle "Vita ansehen →"
          link that opens the curriculum modal. */}
      <PeopleSection
        content={shuffledTeam}
        vitaLinkLabel={teamContent.team.vitaLinkLabel}
      />

      {/* Scientific review board — always its own section, fixed order. */}
      <PeopleSection content={teamContent.reviewBoard} />

      {/* Initiativbewerbung */}
      <TeamCTA content={teamContent.cta} />
    </>
  );
}
