import type { Metadata } from "next";
import { teamContent } from "@/content/kurse/team";
import type { Person } from "@/content/kurse/team-types";
import { Header } from "@/app/kurse/_components/header";
import { Footer } from "@/app/kurse/_components/footer";
import { TYPO } from "@/app/kurse/_components/typography";
import { PeopleSection } from "@/app/kurse/_components/sections/team/people-section";
import { TeamCTA } from "@/app/kurse/_components/sections/team/team-cta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: teamContent.meta.title,
  description: teamContent.meta.description,
  alternates: { canonical: "https://ephia.de/team" },
};

function shuffle<T>(input: readonly T[]): T[] {
  const out = [...input];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function TeamPage() {
  const shuffledTeam = {
    ...teamContent.team,
    items: shuffle<Person>(teamContent.team.items),
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAEBE1] text-black">
      <Header />
      <main className="flex-1">
        <section className="bg-[#FAEBE1] pt-16 md:pt-24 pb-10 md:pb-14">
          <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
            <h1 className={`${TYPO.h1} text-black`}>
              {teamContent.hero.heading}
            </h1>
            <p className={`${TYPO.bodyLead} mt-6`}>{teamContent.hero.intro}</p>
          </div>
        </section>

        <PeopleSection
          content={shuffledTeam}
          vitaLinkLabel={teamContent.team.vitaLinkLabel}
        />

        <PeopleSection content={teamContent.reviewBoard} />

        <TeamCTA content={teamContent.cta} />
      </main>
      <Footer />
    </div>
  );
}
