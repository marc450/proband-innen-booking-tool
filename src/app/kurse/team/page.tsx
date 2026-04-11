import type { Metadata } from "next";
import { teamContent } from "@/content/kurse/team";
import { TYPO } from "../_components/typography";
import { DozentenSection } from "../_components/sections/team/dozenten-section";
import { TeamSection } from "../_components/sections/team/team-section";
import { TeamCTA } from "../_components/sections/team/team-cta";

export const metadata: Metadata = {
  title: teamContent.meta.title,
  description: teamContent.meta.description,
  alternates: { canonical: "https://kurse.ephia.de/kurse/team" },
};

export default function TeamPage() {
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

      {/* Dozent:innen — with "Vita ansehen" curriculum modal */}
      <DozentenSection content={teamContent.dozenten} />

      {/* Operations team (Marc, Jana, Kathrin) */}
      <TeamSection content={teamContent.team} />

      {/* Scientific review board */}
      <TeamSection content={teamContent.reviewBoard} />

      {/* Initiativbewerbung */}
      <TeamCTA content={teamContent.cta} />
    </>
  );
}
