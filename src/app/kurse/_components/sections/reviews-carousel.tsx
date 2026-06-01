"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Star, BadgeCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCarouselScroll } from "../use-carousel-scroll";

export interface ReviewItem {
  id: string;
  rating: number;
  displayName: string;
  bodyText: string | null;
  courseLabel: string | null;
}

interface ReviewsCarouselProps {
  items: ReviewItem[];
}

// Truncation-Schwelle in Zeichen: gleicher Wert wie im Proband:innen-
// Carousel, damit die beiden Sektionen visuell konsistent wirken.
const PREVIEW_CHAR_LIMIT = 240;

function truncateAtWord(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit);
  // An letzter Leerstelle abschneiden, damit kein Wort mittendurch
  // gerissen wird. Fallback: hartes Slice falls es keine gibt.
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > limit * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd();
}

export function StarRow({ rating }: { rating: number }) {
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
  // Scroll-, Active-Card-Tracking, Reachable-Count-Messung und
  // Dot-Index-Clamping leben in useCarouselScroll, geteilt mit
  // proband-reviews-carousel und prose-carousel.
  // smoothScroll bewusst aus, weil prose-carousel beobachtet hat
  // dass smooth-Scroll + snap-mandatory in Chromium auf manchen
  // Layouts zur Ausgangs-Karte zurückspringen kann.
  const {
    scrollerRef,
    activeIndex,
    activeDotIdx,
    reachableCount,
    canPrev,
    canNext,
    scrollToIndex,
  } = useCarouselScroll({ itemCountKey: items.length });
  const [openReview, setOpenReview] = useState<ReviewItem | null>(null);

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-2 -mx-5 md:-mx-8 px-5 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const isTruncated =
            !!item.bodyText && item.bodyText.length > PREVIEW_CHAR_LIMIT;
          const preview =
            item.bodyText && isTruncated
              ? truncateAtWord(item.bodyText, PREVIEW_CHAR_LIMIT)
              : item.bodyText;
          return (
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

              {preview && (
                <blockquote className="text-sm md:text-base text-black/80 leading-relaxed mb-5">
                  {/* Inline "...mehr lesen" so der Link direkt im Text-
                      fluss sitzt und das Ellipsis-Zeichen ohne harten
                      Zeilenumbruch davor steht. Vorher silent
                      line-clamp-[8], jetzt explizit. */}
                  {`„${preview}`}
                  {isTruncated ? (
                    <>
                      …{" "}
                      <button
                        type="button"
                        onClick={() => setOpenReview(item)}
                        className="text-[#0066FF] font-semibold hover:underline focus:outline-none focus-visible:underline"
                      >
                        mehr lesen
                      </button>
                    </>
                  ) : (
                    <>&ldquo;</>
                  )}
                </blockquote>
              )}

              <figcaption className="space-y-1 mt-auto">
                <div className="font-bold text-black">{item.displayName}</div>
                {item.courseLabel && (
                  <div className="text-xs text-black/60">
                    Bewertung zum Kurs „{item.courseLabel}&ldquo;
                  </div>
                )}
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
                  idx === activeDotIdx ? "w-8 bg-[#0066FF]" : "w-2 bg-black/20"
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
            auf manchen Hosts rose, was im Modal-Kontext zu nah am
            Rose-Card-Hintergrund liegt. */}
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="sr-only">
              Bewertung von {openReview?.displayName ?? ""}
            </DialogTitle>
          </DialogHeader>
          {openReview && (
            <div className="space-y-4">
              <StarRow rating={openReview.rating} />
              {openReview.bodyText && (
                <blockquote className="text-sm md:text-base text-black/85 leading-relaxed whitespace-pre-line">
                  „{openReview.bodyText}&ldquo;
                </blockquote>
              )}
              <div>
                <p className="font-bold text-black">{openReview.displayName}</p>
                {openReview.courseLabel && (
                  <p className="text-xs text-black/60 mt-1">
                    Bewertung zum Kurs „{openReview.courseLabel}&ldquo;
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
