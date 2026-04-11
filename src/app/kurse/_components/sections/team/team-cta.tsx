import { Mail } from "lucide-react";
import type { TeamPageContent } from "@/content/kurse/team-types";
import { TYPO } from "../../typography";

export function TeamCTA({ content }: { content: TeamPageContent["cta"] }) {
  const subject = encodeURIComponent("Initiativbewerbung");
  const mailto = `mailto:${content.email}?subject=${subject}`;

  return (
    <section className="bg-[#FAEBE1] py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
        <h2 className={`${TYPO.h2} text-black`}>{content.heading}</h2>
        <p className={`${TYPO.bodyLead} mt-4`}>{content.body}</p>

        {content.bullets.length > 0 && (
          <ul className="mt-6 inline-flex flex-col gap-2 text-left">
            {content.bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-2.5 text-sm md:text-base text-black/75"
              >
                <span
                  aria-hidden="true"
                  className="mt-[0.55em] w-1.5 h-1.5 rounded-full bg-[#0066FF] shrink-0"
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10">
          <a
            href={mailto}
            className="inline-flex items-center gap-2 text-base md:text-lg font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-7 py-4 transition-colors"
          >
            <Mail className="w-5 h-5" strokeWidth={2.25} />
            <span>{content.email}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
