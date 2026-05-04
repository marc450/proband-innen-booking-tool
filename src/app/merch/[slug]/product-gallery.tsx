"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";

interface Props {
  images: string[];
  alt: string;
  /** Forwards `loading="eager"` to the hero element only. */
  priority?: boolean;
}

/**
 * Hero image with up to N thumbnails below. Clicking a thumbnail swaps
 * the hero. Falls back to a placeholder icon when no images are given.
 * Single-image products skip the thumbnail strip entirely.
 *
 * The hero is a plain <img> so the rendered box adapts to the source's
 * natural aspect ratio (Next/Image's `fill` mode would require a fixed
 * container aspect, which we don't have because image dimensions
 * aren't stored in the DB). To avoid the box collapsing to zero
 * height between clicks (which made the new image "disappear before
 * loading"), we preload the next source via `new Image()` and only
 * swap the rendered src once the browser has it decoded. The thumb
 * selection ring still updates instantly.
 */
export function ProductGallery({ images, alt, priority }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [renderedSrc, setRenderedSrc] = useState(() => images[0] ?? "");

  // Preload the requested image, then promote it to renderedSrc when
  // it has finished decoding so the hero never goes blank between
  // clicks. If the requested image is already what we're rendering
  // (or already cached), the swap happens on the same tick.
  useEffect(() => {
    const target = images[activeIdx];
    if (!target || target === renderedSrc) return;
    const preloader = new window.Image();
    let cancelled = false;
    preloader.onload = () => {
      if (!cancelled) setRenderedSrc(target);
    };
    preloader.onerror = () => {
      // If the preload fails for any reason, fall back to the direct
      // swap so the user isn't stuck on the old image forever.
      if (!cancelled) setRenderedSrc(target);
    };
    preloader.src = target;
    return () => {
      cancelled = true;
    };
  }, [activeIdx, images, renderedSrc]);

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-white rounded-[10px] flex items-center justify-center">
        <ImageIcon className="w-16 h-16 text-black/20" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={renderedSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="w-full h-auto block bg-white rounded-[10px]"
      />
      {images.length > 1 && (
        <div className="flex gap-3">
          {images.map((src, i) => {
            const isActive = i === activeIdx;
            return (
              <button
                key={src + i}
                type="button"
                onClick={() => setActiveIdx(i)}
                aria-label={`Bild ${i + 1} anzeigen`}
                aria-current={isActive}
                className={`relative aspect-square w-20 md:w-24 shrink-0 bg-white rounded-[10px] overflow-hidden cursor-pointer transition-all ${
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
