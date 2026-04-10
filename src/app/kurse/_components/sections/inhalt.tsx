"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CourseInhaltContent } from "@/content/kurse/types";

export function Inhalt({ content }: { content: CourseInhaltContent }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-[#FAEBE1] py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-5 md:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center tracking-wide mb-4">
          {content.heading}
        </h2>
        {content.intro && (
          <p className="text-center text-base md:text-lg text-black/70 mb-12">
            {content.intro}
          </p>
        )}

        <ul className="space-y-3">
          {content.chapters.map((chapter, idx) => {
            const isOpen = openIndex === idx;
            const hasDetails = !!(chapter.subsections?.length || chapter.summary);

            return (
              <li key={chapter.number} className="bg-white rounded-[10px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => hasDetails && setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center gap-4 px-5 md:px-6 py-4 md:py-5 text-left transition-colors hover:bg-black/[0.02]"
                  aria-expanded={isOpen}
                >
                  <span className="text-lg md:text-xl font-bold text-[#0066FF] w-8 shrink-0 tabular-nums">
                    {chapter.number}.
                  </span>
                  <span className="flex-1 text-base md:text-lg font-semibold">
                    {chapter.title}
                  </span>
                  {hasDetails && (
                    <ChevronDown
                      className={`w-5 h-5 text-black/50 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  )}
                </button>

                {isOpen && hasDetails && (
                  <div className="px-5 md:px-6 pb-5 md:pb-6 pt-1 pl-[4.25rem] md:pl-[4.5rem]">
                    {chapter.summary && (
                      <p className="text-sm md:text-base text-black/75 leading-relaxed">
                        {chapter.summary}
                      </p>
                    )}
                    {chapter.subsections && chapter.subsections.length > 0 && (
                      <ul className="space-y-3">
                        {chapter.subsections.map((sub) => (
                          <li key={sub.title}>
                            <p className="text-sm md:text-base font-semibold text-black">
                              {sub.title}
                            </p>
                            <p className="text-sm md:text-base text-black/70 leading-relaxed mt-0.5">
                              {sub.description}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
