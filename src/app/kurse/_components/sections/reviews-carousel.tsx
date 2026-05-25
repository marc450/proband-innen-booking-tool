"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star, BadgeCheck } from "lucide-react";

interface ReviewItem {
  id: string;
  rating: number;
  displayName: string;
  bodyText: string | null;
  courseLabel: string | null;
}

interface ReviewsCarouselProps {
  items: ReviewItem[];
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${rating} von 5 Sternen`}
    >
      {[1, 2, 3, 4, 5].map((v) => {
        const active = v <= rating;
        return (
          <Star
            key={v}
            className="h-4 w-4"
            fill={active ? "#0066FF" : "none"}
            stroke={active ? "#0066FF" : "#D1D5DB"}
            strokeWidth={1.5}
          />
        );
      })}
    </div>
  );
}

export function ReviewsCarousel({ items }: ReviewsCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [atEnd, setAtEnd] = useState(false);

  // Mirror the active-card / atEnd logic from prose-carousel so the
  // dot indicators + next-button-disabled state behave identically.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

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
          <figure
            key={item.id}
            data-card
            className="bg-[#FAEBE1] rounded-[10px] p-6 md:p-7 snap-start shrink-0 w-[85%] sm:w-[55%] md:w-[calc((100%-3rem)/3)] flex flex-col"
          >
            <div className="flex items-center justify-between gap-2 mb-4">
              <StarRow rating={item.rating} />
              <div
                className="flex items-center gap-1 text-[11px] text-[#0066FF] font-medium"
                title="Verifiziert: Bewertung stammt aus einer echten Kursbuchung."
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                <span>Verifiziert</span>
              </div>
            </div>

            {/* line-clamp keeps any one extra-long review from forcing
                every other card to stretch. Full body_text still lives
                in the JSON-LD reviewBody so Google sees the unclipped
                version. */}
            <blockquote className="text-sm md:text-base text-black/80 leading-relaxed mb-5 line-clamp-[8]">
              {item.bodyText ? `„${item.bodyText}"` : null}
            </blockquote>

            <figcaption className="space-y-1">
              <div className="font-bold text-black">{item.displayName}</div>
              {item.courseLabel && (
                <div className="text-xs text-black/60">
                  Bewertung zum Kurs „{item.courseLabel}"
                </div>
              )}
            </figcaption>
          </figure>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Vorherige Bewertung"
            onClick={() => scrollToIndex(activeIndex - 1)}
            disabled={!canPrev}
            className="hidden md:flex absolute -left-5 top-[calc(50%-1.5rem)] -translate-y-1/2 h-12 w-12 items-center justify-center rounded-full bg-[#0066FF] text-white shadow-md hover:bg-[#0055DD] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Nächste Bewertung"
            onClick={() => scrollToIndex(activeIndex + 1)}
            disabled={!canNext}
            className="hidden md:flex absolute -right-5 top-[calc(50%-1.5rem)] -translate-y-1/2 h-12 w-12 items-center justify-center rounded-full bg-[#0066FF] text-white shadow-md hover:bg-[#0055DD] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="flex justify-center gap-2 mt-6">
            {items.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Zu Bewertung ${idx + 1}`}
                onClick={() => scrollToIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === activeIndex ? "w-8 bg-[#0066FF]" : "w-2 bg-black/20"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
