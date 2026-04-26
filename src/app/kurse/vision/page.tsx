import type { Metadata } from "next";
import { TYPO } from "../_components/typography";

export const metadata: Metadata = {
  title: "Unsere Vision | EPHIA",
  description:
    "Warum wir EPHIA gegründet haben: inklusive, zugängliche ästhetische Medizin. Bildungsstandards neu definieren. Technische Exzellenz mit sozialer Kompetenz verbinden.",
  alternates: { canonical: "https://kurse.ephia.de/kurse/vision" },
};

/**
 * Each paragraph is its own string. Blank lines in the source copy map
 * to paragraph breaks here — no markdown, no rich text, just plain text
 * rendered inside a narrow readable column.
 */
const paragraphs: string[] = [
  "Wir haben EPHIA gegründet, weil wir zeigen wollen, dass ästhetische Medizin ein hochsensibler Raum ist. Ein Raum, in dem es nicht reicht, Techniken zu lehren, sondern in dem wir lernen müssen, uns mit den Geschichten und Erfahrungen unserer Patient:innen auseinanderzusetzen.",
  "Wenn wir gute Medizin machen wollen, dann reicht ein anatomisches Verständnis allein nicht. Dann braucht es kulturelles Wissen, diskriminierungssensible Haltung und die Bereitschaft, sich in andere Lebensrealitäten hineinzudenken.",
  "Menschen aus ganz verschiedenen sozialen und kulturellen Kontexten stoßen immer wieder an Grenzen, wenn es um ästhetische Medizin geht. Viele finden nicht den Zugang, viele finden sich in den Standards nicht wieder. Und genau da setzen wir an.",
  "Wir möchten die ästhetische Medizin zu einem Raum machen, der inklusiv ist und zugänglich. Für alle, nicht nur für wenige. Unsere Mission ist es, Bildungsstandards neu zu definieren. Und zwar so, dass jede Ärztin und jeder Arzt das Wissen, die Haltung und die Unterstützung hat, um gute, sichere und vor allem passende Behandlungen anbieten zu können: Behandlungen, die sich am Menschen orientieren, nicht an Normen.",
  "Dafür bauen wir ein Ausbildungsangebot, das technische Exzellenz mit sozialer Kompetenz verbindet. Und eine Community, in der Wissen nicht von oben herab vermittelt wird, sondern im Austausch wächst.",
  "Wir glauben daran, dass klinisches Know-how, wie wir es aus der Notfallmedizin, dem Rettungsdienst oder der Bundeswehr mitbringen, sich auch auf eine andere Medizin übertragen lässt. Auf eine Medizin, die zwar ästhetisch arbeitet, aber trotzdem Haltung zeigt.",
  "Und ja, wir wissen, dass wir dabei nicht alles richtig machen werden. Aber wir wollen lernen. Mit der Community, mit unseren Teilnehmenden, mit denen, die sich einbringen. Denn nur wenn wir bereit sind, uns auch selbst zu hinterfragen, können wir dieser Vision wirklich treu bleiben.",
  "Wir machen EPHIA nicht nur für heute. Sondern für die Medizin, die wir uns für morgen wünschen.",
];

export default function VisionPage() {
  return (
    <>
      {/* Hero — matches the Team page hero for visual consistency. */}
      <section className="bg-[#FAEBE1] pt-16 md:pt-24 pb-10 md:pb-14">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <h1 className={`${TYPO.h1} text-black`}>Unsere Vision</h1>
        </div>
      </section>

      {/* Body copy — narrow single-column read. Slightly larger body size
          (bodyLead) than a regular card, because this is a long-form text
          and the paragraphs should feel inviting to read. */}
      <section className="bg-[#FAEBE1] pb-24 md:pb-32">
        <div className="max-w-2xl mx-auto px-5 md:px-8">
          <div className="flex flex-col gap-6 md:gap-7">
            {paragraphs.map((p, i) => (
              <p key={i} className={`${TYPO.bodyLead} text-black/80`}>
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
