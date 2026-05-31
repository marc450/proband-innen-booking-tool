"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CourseProseSectionItem } from "@/content/kurse/types";
import { useCarouselScroll } from "../use-carousel-scroll";

interface ProseCarouselProps {
  items: CourseProseSectionItem[];
  cardBg: string;
}

export function ProseCarousel({ items, cardBg }: ProseCarouselProps) {
  // Scroll-, Active-Card-Tracking, Reachable-Count-Messung und
  // Dot-Index-Clamping leben in useCarouselScroll, geteilt mit
  // reviews-carousel und proband-reviews-carousel.
  // smoothScroll bewusst aus: smooth + scroll-snap-type: x mandatory
  // bricht in Chromium gelegentlich die Scroll-Animation ab und
  // springt auf die Ausgangs-Karte zurück. Instant-Scroll plus
  // browser-eigenes Snap-Easing fühlt sich smooth genug an.
  const {
    scrollerRef,
    activeIndex,
    activeDotIdx,
    reachableCount,
    canPrev,
    canNext,
    scrollToIndex,
  } = useCarouselScroll({ itemCountKey: items.length });

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-2 -mx-5 md:-mx-8 px-5 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <div
            key={item.title}
            data-card
            className={`${cardBg} rounded-[10px] p-6 md:p-7 snap-start shrink-0 w-[85%] sm:w-[55%] md:w-[calc((100%-3rem)/3)]`}
          >
            <h3 className="text-lg font-bold mb-2">{item.title}</h3>
            <p className="text-sm md:text-base text-black/75 leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Vorherige Karte"
        onClick={() => scrollToIndex(activeIndex - 1)}
        disabled={!canPrev}
        className="hidden md:flex absolute -left-5 top-[calc(50%-1.5rem)] -translate-y-1/2 h-12 w-12 items-center justify-center rounded-full bg-[#0066FF] text-white shadow-md hover:bg-[#0055DD] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        type="button"
        aria-label="Nächste Karte"
        onClick={() => scrollToIndex(activeIndex + 1)}
        disabled={!canNext}
        className="hidden md:flex absolute -right-5 top-[calc(50%-1.5rem)] -translate-y-1/2 h-12 w-12 items-center justify-center rounded-full bg-[#0066FF] text-white shadow-md hover:bg-[#0055DD] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {reachableCount > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: reachableCount }, (_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Zu Position ${idx + 1} von ${reachableCount}`}
              onClick={() => scrollToIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === activeDotIdx ? "w-8 bg-[#0066FF]" : "w-2 bg-black/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
