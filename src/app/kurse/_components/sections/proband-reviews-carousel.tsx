"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCarouselScroll } from "../use-carousel-scroll";
import type { ProbandReviewItem } from "./proband-reviews";

/**
 * Carousel-Hülle für die Proband:innen-Reviews unterhalb des Hero.
 * Mechanik gespiegelt vom Ärzt:innen-Reviews-Carousel (snap-x scroller,
 * Pfeil-Buttons auf Desktop, Dot-Indicators), Optik aber angepasst:
 * weiße Karten auf der Rose-Sektion statt Rose-Karten auf weißer
 * Sektion, damit die werde-proband-in Landingpage visuell konsistent
 * mit den /kurse-Testimonials bleibt.
 *
 * Lange Reviews werden bei einer harten Zeichengrenze abgeschnitten
 * und bekommen ein „...mehr lesen"-Link, das den vollen Text in einem
 * Modal öffnet. Vorher waren sie via line-clamp-[8] still abgeschnitten
 * und die Person konnte das Ende der Bewertung nicht sehen.
 *
 * Scroll-, Dot- und Reachability-Logik leben in useCarouselScroll,
 * geteilt mit reviews-carousel und prose-carousel.
 */

const PRIMARY = "#0066FF";

// Truncation-Schwelle in Zeichen: knapp unterhalb dessen was eine
// durchschnittliche Karte ohne Scroll sauber zeigt. Bewusst nicht
// per Visual-Line-Count berechnet, weil das bei verschiedenen Geräten
// und Font-Loading-States flackern würde.
const PREVIEW_CHAR_LIMIT = 240;

interface Props {
  reviews: ProbandReviewItem[];
}

function truncateAtWord(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit);
  // An letzter Leerstelle abschneiden, damit kein Wort mittendurch
  // gerissen wird. Fallback: hartes Slice falls es keine gibt.
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > limit * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd();
}

function StarRow({ rating }: { rating: number }) {
  const safe = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${safe} von 5 Sternen`}
    >
      {[1, 2, 3, 4, 5].map((v) => {
        const active = v <= safe;
        return (
          <Star
            key={v}
            className="h-4 w-4"
            strokeWidth={1.5}
            style={{
              color: active ? PRIMARY : "#D1D5DB",
              fill: active ? PRIMARY : "none",
            }}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

export function ProbandReviewsCarousel({ reviews }: Props) {
  const {
    scrollerRef,
    activeIndex,
    activeDotIdx,
    reachableCount,
    canPrev,
    canNext,
    scrollToIndex,
  } = useCarouselScroll({
    itemCountKey: reviews.length,
    // smoothScroll: Marc-Preference 2026-05-31, läuft auf dieser
    // Sektion ohne Snap-Conflict weil die Karten alle gleich groß
    // sind und die Snap-Stops genau die Stride-Distanz haben.
    smoothScroll: true,
  });
  const [openReview, setOpenReview] = useState<ProbandReviewItem | null>(null);

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-2 -mx-5 md:-mx-8 px-5 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {reviews.map((r) => {
          const isTruncated = r.body.length > PREVIEW_CHAR_LIMIT;
          const preview = isTruncated
            ? truncateAtWord(r.body, PREVIEW_CHAR_LIMIT)
            : r.body;
          return (
            <figure
              key={r.id}
              data-card
              className="bg-white rounded-[10px] p-6 md:p-7 snap-start shrink-0 w-[85%] sm:w-[55%] md:w-[calc((100%-3rem)/3)] flex flex-col"
            >
              <StarRow rating={r.rating} />
              <blockquote className="flex-1 text-sm md:text-base text-black/80 leading-relaxed mt-4 mb-5">
                {/* Inline "...mehr lesen" so der Link direkt im Text-
                    fluss sitzt und das Ellipsis-Zeichen ohne harten
                    Zeilenumbruch davor steht. */}
                {`„${preview}`}
                {isTruncated ? (
                  <>
                    …{" "}
                    <button
                      type="button"
                      onClick={() => setOpenReview(r)}
                      className="text-[#0066FF] font-semibold hover:underline focus:outline-none focus-visible:underline"
                    >
                      mehr lesen
                    </button>
                  </>
                ) : (
                  <>&ldquo;</>
                )}
              </blockquote>
              <figcaption>
                <div className="font-bold text-black">{r.firstName}</div>
              </figcaption>
            </figure>
          );
        })}
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
                  idx === activeDotIdx
                    ? "w-8 bg-[#0066FF]"
                    : "w-2 bg-black/20"
                }`}
              />
            ))}
          </div>
        </>
      )}

      <Dialog
        open={!!openReview}
        onOpenChange={(open) => {
          if (!open) setOpenReview(null);
        }}
      >
        {/* bg-white override: das Default-bg-background-Token rendert
            auf der werde-proband-in Domain rose, was im Modal-Kontext
            zu nah am Section-Hintergrund liegt und die Karte zerläuft. */}
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="sr-only">
              Bewertung von {openReview?.firstName ?? ""}
            </DialogTitle>
          </DialogHeader>
          {openReview && (
            <div className="space-y-4">
              <StarRow rating={openReview.rating} />
              <blockquote className="text-sm md:text-base text-black/85 leading-relaxed whitespace-pre-line">
                „{openReview.body}&ldquo;
              </blockquote>
              <p className="font-bold text-black">{openReview.firstName}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
