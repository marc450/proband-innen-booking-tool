"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CourseProseSectionItem } from "@/content/kurse/types";

interface ProseCarouselProps {
  items: CourseProseSectionItem[];
  cardBg: string;
}

export function ProseCarousel({ items, cardBg }: ProseCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // Active card = the one whose left edge is closest to the
    // scroller's left edge. Uses getBoundingClientRect because the
    // scroller has negative horizontal margins, so offsetLeft would
    // disagree with scrollLeft about coordinates.
    const update = () => {
      const cards = Array.from(
        scroller.querySelectorAll<HTMLElement>("[data-card]"),
      );
      if (!cards.length) return;
      const scrollerLeft = scroller.getBoundingClientRect().left;
      let bestIdx = 0;
      let bestDist = Infinity;
      cards.forEach((card, idx) => {
        const dist = Math.abs(card.getBoundingClientRect().left - scrollerLeft);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });
      setActiveIndex(bestIdx);
      // atEnd needs its own bit because on desktop (3 cards visible)
      // bestIdx tops out at items.length - 3, not items.length - 1.
      // Without this, the next-button would stay enabled when the
      // last card is already fully in view.
      setAtEnd(
        scroller.scrollLeft + scroller.clientWidth >=
          scroller.scrollWidth - 1,
      );
    };

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    return () => scroller.removeEventListener("scroll", update);
  }, []);

  const scrollToIndex = (idx: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const card = scroller.querySelectorAll<HTMLElement>("[data-card]")[idx];
    if (!card) return;
    const delta =
      card.getBoundingClientRect().left - scroller.getBoundingClientRect().left;
    // behavior: "smooth" is intentionally not used: it conflicts with
    // scroll-snap-type: x mandatory in Chromium and the smooth scroll
    // gets cancelled, snapping back to the starting card. Instant
    // scroll + the browser's own snap animation feels smooth enough.
    scroller.scrollTo({ left: scroller.scrollLeft + delta });
  };

  const canPrev = activeIndex > 0;
  const canNext = !atEnd;

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

      <div className="flex justify-center gap-2 mt-6">
        {items.map((item, idx) => (
          <button
            key={item.title}
            type="button"
            aria-label={`Zu Karte ${idx + 1}`}
            onClick={() => scrollToIndex(idx)}
            className={`h-2 rounded-full transition-all ${
              idx === activeIndex ? "w-8 bg-[#0066FF]" : "w-2 bg-black/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
