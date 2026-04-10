"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CourseFaqContent } from "@/content/kurse/types";

export function Faq({ content }: { content: CourseFaqContent }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-5 md:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center tracking-wide mb-12">
          {content.heading}
        </h2>

        <ul className="space-y-3">
          {content.items.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <li
                key={item.question}
                className="bg-[#FAEBE1] rounded-[10px] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-start gap-4 px-5 md:px-6 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="flex-1 text-base md:text-lg font-semibold pr-2">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-black/50 shrink-0 mt-1 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 md:px-6 pb-5 md:pb-6 -mt-1">
                    <p className="text-sm md:text-base text-black/75 leading-relaxed whitespace-pre-line">
                      {item.answer}
                    </p>
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
