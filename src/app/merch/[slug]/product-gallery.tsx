"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImageIcon } from "lucide-react";

interface Props {
  images: string[];
  alt: string;
  /** Forwards `priority` to the first hero image only. */
  priority?: boolean;
}

/**
 * Hero image with up to N thumbnails below. Clicking a thumbnail (or
 * swiping on touch devices) swaps the hero. Falls back to a placeholder
 * icon when no images are given. Single-image products skip the
 * thumbnail strip entirely.
 *
 * All images are rendered as stacked next/image components inside an
 * aspect-square container; the active one fades in and the rest sit at
 * opacity-0. This means:
 *   - the browser downloads the optimized AVIF/WebP version of every
 *     gallery image (typically 30 to 80 KB each), so switching is
 *     instant once the page has settled
 *   - product photos with non-square aspect ratios get letterboxed via
 *     object-contain rather than cropped (we don't store dimensions in
 *     the DB, so a fixed aspect-square box is the simplest reliable
 *     layout)
 */
export function ProductGallery({ images, alt, priority }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  // Touch swipe: track the X coord at touchstart, compute delta on
  // touchend, advance one slot when the delta crosses the threshold.
  // Y delta is intentionally ignored so vertical scroll keeps working
  // when the user just brushes the gallery on the way to the rest of
  // the page.
  const touchStartX = useRef<number | null>(null);
  const SWIPE_THRESHOLD_PX = 40;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (dx < 0 && activeIdx < images.length - 1) {
      setActiveIdx(activeIdx + 1);
    } else if (dx > 0 && activeIdx > 0) {
      setActiveIdx(activeIdx - 1);
    }
  };

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-white rounded-[10px] flex items-center justify-center">
        <ImageIcon className="w-16 h-16 text-black/20" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="relative aspect-square bg-white rounded-[10px] overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {images.map((src, i) => (
          <Image
            key={src + i}
            src={src}
            alt={`${alt} ${i + 1}`}
            fill
            quality={85}
            priority={priority && i === 0}
            sizes="(max-width: 768px) 100vw, 600px"
            className={`object-contain transition-opacity duration-200 ${
              i === activeIdx ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>
      {images.length > 1 && (
        // Horizontally scrollable on mobile when more thumbs are
        // configured than fit the viewport (6 × 64px + gaps already
        // overflows ~390px). On md+ everything fits in the gallery
        // column so the scrollbar is moot. We deliberately do NOT use
        // a negative margin to push edge-to-edge — that widens the
        // strip past the viewport and bleeds into a body horizontal
        // overflow that drifts the sticky header inward.
        <div className="flex gap-3 overflow-x-auto md:overflow-visible">
          {images.map((src, i) => {
            const isActive = i === activeIdx;
            return (
              <button
                key={src + i}
                type="button"
                onClick={() => setActiveIdx(i)}
                aria-label={`Bild ${i + 1} anzeigen`}
                aria-current={isActive}
                className={`relative aspect-square w-16 md:w-24 shrink-0 bg-white rounded-[10px] overflow-hidden cursor-pointer transition-all ${
                  isActive
                    ? "ring-2 ring-[#0066FF]"
                    : "ring-1 ring-black/10 hover:ring-black/30 opacity-85 hover:opacity-100"
                }`}
              >
                <Image
                  src={src}
                  alt={`${alt} ${i + 1}`}
                  fill
                  quality={70}
                  sizes="96px"
                  className="object-contain"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
