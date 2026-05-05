"use client";

import { useState } from "react";
import type { CourseProseSectionItem } from "@/content/kurse/types";

interface EditorialDifferentiatorsProps {
  items: CourseProseSectionItem[];
}

/**
 * Tabbed differentiators block — used for the "Was unterscheidet uns?"
 * section on flagship landings where the standard 4-card grid produces
 * a wall of text. Numerals double as tabs: active numeral fills solid,
 * inactive numerals stay outlined. Only the active item's body is
 * visible at a time; the rest stay in the DOM (opacity-0 + absolute)
 * so Google still indexes them.
 */
export function EditorialDifferentiators({
  items,
}: EditorialDifferentiatorsProps) {
  const [active, setActive] = useState(0);

  return (
    <div>
      {/* Tab strip — outlined numerals, active fills solid + underline */}
      <div
        role="tablist"
        aria-label="Differentiators"
        className="flex justify-center items-end gap-6 sm:gap-10 md:gap-16 mb-10 md:mb-14"
      >
        {items.map((item, i) => {
          const isActive = active === i;
          return (
            <button
              key={item.title}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`diff-panel-${i}`}
              onClick={() => setActive(i)}
              className="group flex flex-col items-center cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0066FF] focus-visible:outline-offset-4 rounded-sm transition-opacity"
              style={{ opacity: isActive ? 1 : 0.4 }}
            >
              <span
                className="font-black leading-none select-none transition-all duration-200"
                style={{
                  fontSize: "clamp(48px, 7vw, 88px)",
                  letterSpacing: "-0.02em",
                  color: isActive ? "#0066FF" : "transparent",
                  WebkitTextStroke: isActive ? "0" : "2px #0066FF",
                }}
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                aria-hidden="true"
                className={`h-[2px] mt-3 bg-[#0066FF] transition-all duration-300 ${
                  isActive
                    ? "w-full"
                    : "w-0 group-hover:w-1/2 group-hover:opacity-60"
                }`}
              />
              <span className="sr-only">{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* Panel — active is rendered in flow; others stay in the DOM
          (opacity 0 + absolute) so crawlers index every item even
          though only one is visible at a time. */}
      <div className="relative max-w-3xl mx-auto">
        {items.map((item, i) => {
          const isActive = active === i;
          return (
            <div
              key={item.title}
              id={`diff-panel-${i}`}
              role="tabpanel"
              aria-hidden={!isActive}
              className={`transition-opacity duration-300 text-center ${
                isActive
                  ? "relative opacity-100"
                  : "absolute inset-0 opacity-0 pointer-events-none"
              }`}
            >
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
                {item.title}
              </h3>
              <p className="text-base md:text-lg text-black/75 leading-relaxed">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
