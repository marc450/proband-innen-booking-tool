"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarRow, type ReviewItem } from "./reviews-carousel";

// Continuous marquee variant of the review cards, used on the home
// page. Unlike ReviewsCarousel (manual snap-scroll on course landings),
// this one scrolls smoothly and endlessly via a CSS animation (see
// .ephia-review-marquee in globals.css). CSS handles the hover-pause and
// reduced-motion cases; the only JS here measures the track to keep a
// constant speed and pauses the animation while the "mehr lesen" modal
// is open.

// Marquee speed in px/s. Slow enough to read a card as it drifts past.
const SPEED_PX_PER_SEC = 60;

// Compact card: roughly half the height of the course-landing cards.
// Body text is line-clamped; a "…mehr lesen" link opens the full text
// in a modal, but only when the text actually overflows the clamp.
function CompactReviewCard({
  item,
  onOpen,
}: {
  item: ReviewItem;
  onOpen: (item: ReviewItem) => void;
}) {
  const bodyRef = useRef<HTMLQuoteElement>(null);
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    // ResizeObserver fires once on observe, so the first measurement
    // lands in the callback (not synchronously in the effect body).
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // The clamp box has a fixed height, so font-reflow doesn't resize it
    // and the observer never re-fires. Re-measure once fonts settle so
    // overflow that only appears after the webfont loads is caught.
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, []);

  return (
    <figure className="bg-[#FAEBE1] rounded-[10px] p-5 md:p-6 shrink-0 w-[280px] sm:w-[320px] md:w-[360px] h-[200px] flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <StarRow rating={item.rating} />
        <div
          className="flex items-center gap-1 text-[11px] text-[#0066FF] font-medium"
          title="Verifiziert: Bewertung stammt aus einer echten Kursbuchung."
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          <span>Verifiziert</span>
        </div>
      </div>

      {item.bodyText && (
        <blockquote
          ref={bodyRef}
          className="text-sm text-black/80 leading-relaxed line-clamp-3"
        >
          {`„${item.bodyText}"`}
        </blockquote>
      )}
      {clamped && (
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="self-start mt-1 text-sm font-semibold text-[#0066FF] hover:underline focus:outline-none focus-visible:underline"
        >
          …mehr lesen
        </button>
      )}

      <figcaption className="mt-auto pt-3">
        <div className="font-bold text-black text-sm">{item.displayName}</div>
        {item.courseLabel && (
          <div className="text-xs text-black/60">
            Bewertung zum Kurs „{item.courseLabel}&ldquo;
          </div>
        )}
      </figcaption>
    </figure>
  );
}

export function ReviewsMarquee({ items }: { items: ReviewItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [openReview, setOpenReview] = useState<ReviewItem | null>(null);
  // Animation duration in seconds, derived from one copy's width so the
  // pixel speed stays constant no matter how many reviews there are.
  const [durationS, setDurationS] = useState(0);
  // Touch viewports get a native swipe-snap scroller instead of the
  // auto-marquee: a transform-driven CSS animation can't be dragged with
  // a finger, so mobile users could never page through the reviews.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const oneCopyWidth = track.scrollWidth / 2; // two identical copies
      setDurationS(oneCopyWidth > 0 ? oneCopyWidth / SPEED_PX_PER_SEC : 0);
    };
    // ResizeObserver's first callback does the initial measure, so no
    // setState runs synchronously in the effect body.
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    // Re-measure once the webfont settles: card widths can shift as
    // Roboto replaces the fallback, which changes the track width.
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, []);

  // Desktop marquee needs two identical copies so the -50% translate
  // loops seamlessly. Mobile swipes through a single set (duplicates
  // would just look like the same review twice while paging).
  const loopItems = isMobile ? items : [...items, ...items];

  return (
    <>
      <div
        className={`-mx-5 md:-mx-8 px-5 md:px-8 ${
          isMobile
            ? "overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "relative overflow-hidden"
        }`}
      >
        <div
          ref={trackRef}
          // Spacing via right margin (not flex gap) so every card —
          // including the last of each copy — carries equal trailing
          // space, which makes translateX(-50%) land exactly on the
          // second copy's first card.
          className={`flex w-max ${
            isMobile ? "" : "ephia-review-marquee will-change-transform"
          }`}
          style={
            !isMobile && durationS
              ? {
                  animationDuration: `${durationS}s`,
                  // Hover-pause is CSS; this only adds the modal-open pause.
                  ...(openReview ? { animationPlayState: "paused" } : {}),
                }
              : undefined
          }
        >
          {loopItems.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className={`mr-4 md:mr-6 ${isMobile ? "snap-start" : ""}`}
            >
              <CompactReviewCard item={item} onOpen={setOpenReview} />
            </div>
          ))}
        </div>
      </div>

      <Dialog
        open={!!openReview}
        onOpenChange={(open) => {
          if (!open) setOpenReview(null);
        }}
      >
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
    </>
  );
}
