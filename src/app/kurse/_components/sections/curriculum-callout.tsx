import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import type { CourseCurriculumLink } from "@/content/kurse/types";

export function CurriculumCallout({
  content,
}: {
  content: CourseCurriculumLink;
}) {
  return (
    <section className="bg-[#FAEBE1] pt-2 pb-10 md:pt-4 md:pb-14">
      <div className="max-w-5xl mx-auto px-5 md:px-8">
        <div className="bg-white rounded-[10px] p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center md:gap-8">
          <div className="flex-shrink-0 w-12 h-12 rounded-[10px] bg-[#0066FF]/10 flex items-center justify-center mb-4 md:mb-0">
            <Compass className="w-6 h-6 text-[#0066FF]" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-2 bg-[#FAEBE1] rounded-full px-3 py-1 mb-3 text-xs font-semibold tracking-[0.15em] uppercase text-[#0066FF]">
              {content.pill}
            </span>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
              {content.heading}
            </h2>
            <p className="text-base text-black/75 leading-relaxed">
              {content.description}
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:ml-6 flex-shrink-0">
            <Link
              href={content.ctaHref}
              className="inline-flex items-center gap-2 bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold px-[25px] py-[15px] rounded-[10px] text-base transition-colors"
            >
              {content.ctaLabel}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
