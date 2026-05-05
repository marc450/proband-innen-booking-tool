"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";

interface Props {
  images: string[];
  alt: string;
  /** Forwards `loading="eager"` to the hero element only. */
  priority?: boolean;
}

/**
 * Hero image with up to N thumbnails below. Clicking a thumbnail (or
 * swiping on touch devices) swaps the hero. Falls back to a placeholder
 * icon when no images are given. Single-image products skip the
 * thumbnail strip entirely.
 *
 * The hero is a plain <img> so the rendered box adapts to the source's
 * natural aspect ratio (next/image's `fill` mode would force a fixed
 * aspect-square box and letterbox non-square uploads, which Marc has
 * ruled out). The slow-switch problem is solved at a different layer:
 *   1. on mount we kick off a `new window.Image()` for every sibling
 *      so the browser caches them in parallel with the page settling
 *   2. on click/swipe we still preload-then-swap so an un-cached
 *      sibling (e.g. extremely slow network) doesn't flash blank
 */
export function ProductGallery({ images, alt, priority }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [renderedSrc, setRenderedSrc] = useState(() => images[0] ?? "");

  // Warm the browser cache for every non-active image on mount so the
  // first thumbnail click is instant. Runs once per `images` reference
  // change. We don't need to keep references because the browser's HTTP
  // cache holds the result; the Image objects can be GC'd.
  useEffect(() => {
    if (images.length <= 1) return;
    images.forEach((src, i) => {
      if (i === 0) return;
      const img = new window.Image();
      img.src = src;
    });
  }, [images]);

  // Belt-and-braces preload-then-swap on click/swipe: if the cache
  // happens to be cold (extremely slow network, the warmer above
  // hasn't finished yet), keep the previous image visible until the
  // new one is decoded so the hero never flashes blank.
  useEffect(() => {
    const target = images[activeIdx];
    if (!target || target === renderedSrc) return;
    const preloader = new window.Image();
    let cancelled = false;
    preloader.onload = () => {
      if (!cancelled) setRenderedSrc(target);
    };
    preloader.onerror = () => {
      if (!cancelled) setRenderedSrc(target);
    };
    preloader.src = target;
    return () => {
      cancelled = true;
    };
  }, [activeIdx, images, renderedSrc]);

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
        className="touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={renderedSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="w-full h-auto block bg-white rounded-[10px]"
        />
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
