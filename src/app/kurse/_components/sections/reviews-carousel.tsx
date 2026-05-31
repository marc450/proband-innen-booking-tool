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
  // Reachable scroll positions = wieviele unterschiedliche "leftmost
  // card"-Stände der Scroller erreichen kann. Auf 3-per-view Desktop
  // sind das nur items.length - 2 Positionen, nicht items.length.
  // Vorher hätten Dots length - 2 bis length unerreichbar gerendert,
  // gleich wie der Proband:innen-Carousel-Bug (Fix 2026-05-31).
  const [reachableCount, setReachableCount] = useState(items.length);

  // Re-measure reachable scroll positions on mount + every layout
  // change. ResizeObserver fängt sowohl Viewport-Resizes als auch
  // Content-Swaps (z.B. Style-Reflow nach Font-Load) ab.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const measure = () => {
      const cards = scroller.querySelectorAll<HTMLElement>("[data-card]");
      if (cards.length === 0) {
        setReachableCount(0);
        return;
      }
      const cardWidth = cards[0].offsetWidth;
      const gapPx = parseFloat(getComputedStyle(scroller).gap) || 0;
      const stride = cardWidth + gapPx;
      const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      if (stride <= 0 || maxScrollLeft <= 0) {
        setReachableCount(1);
        return;
      }
      const positions = Math.floor(maxScrollLeft / stride + 0.5) + 1;
      setReachableCount(Math.min(positions, cards.length));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [items.length]);

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
  // Active-Index auf den letzten Dot kappen, damit der rechte Dot
  // beim End-Scroll auch leuchtet (statt unsichtbar zu bleiben weil
  // activeIndex weiter rechts wäre als reachableCount-1).
  const activeDotIdx = Math.min(activeIndex, Math.max(0, reachableCount - 1));

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

      {reachableCount > 1 && (
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
        </>
      )}
    </div>
  );
}
