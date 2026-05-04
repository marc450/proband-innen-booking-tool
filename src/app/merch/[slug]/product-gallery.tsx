"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageIcon } from "lucide-react";

interface Props {
  images: string[];
  alt: string;
  /** Next/Image `sizes` attribute for responsive loading. */
  sizes: string;
  /** Forward Next/Image priority to the currently-visible hero only. */
  priority?: boolean;
}

/**
 * Hero image with up to 3 thumbnails below. Clicking a thumbnail swaps
 * the hero. Falls back to a placeholder icon when no images are given.
 * Single-image products skip the thumbnail strip entirely.
 */
export function ProductGallery({ images, alt, sizes, priority }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = images[activeIdx];

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-white rounded-[10px] flex items-center justify-center">
        <ImageIcon className="w-16 h-16 text-black/20" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square bg-white rounded-[10px] overflow-hidden">
        <Image
          key={active}
          src={active}
          alt={alt}
          fill
          quality={90}
          sizes={sizes}
          priority={priority}
          // object-contain preserves the source aspect ratio so
          // landscape exhibition shots and portrait product photos
          // both render without cropping. White letterbox space
          // appears around images that don't match the square frame.
          className="object-contain"
        />
      </div>
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
