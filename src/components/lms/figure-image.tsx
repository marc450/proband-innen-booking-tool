// Lesson-figure image with click-to-enlarge lightbox.
//
// Server-rendered <figure> wraps this component for the actual <img>
// + caption. The image itself sits inside a button so the whole
// surface is clickable; a small Maximize icon in the top-right of the
// thumbnail hints at the zoom affordance (mirrors the LearnWorlds UX).
//
// Lightbox closes on backdrop click, ESC, or the close button.
// Body scroll is locked while the lightbox is open so background
// content can't scroll behind the modal.
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";

type Props = {
  src: string;
  alt: string;
};

export function FigureImage({ src, alt }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block w-full cursor-zoom-in group"
        aria-label="Bild vergrössern"
      >
        <Image
          src={src}
          alt={alt}
          width={1600}
          height={1200}
          className="w-full h-auto rounded-[10px] block"
        />
        <span
          aria-hidden
          className="absolute top-3 right-3 h-9 w-9 inline-flex items-center justify-center bg-white/90 hover:bg-white text-black rounded-md transition-colors shadow-sm pointer-events-none"
        >
          <Maximize2 className="w-4 h-4" strokeWidth={2.25} />
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
          style={{ left: "var(--lms-sidebar-width, 0px)" }}
          className="fixed top-[45px] right-0 bottom-0 z-40 bg-black/90 flex items-center justify-center p-8 cursor-zoom-out"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="absolute top-4 right-4 h-12 w-12 inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
            aria-label="Schliessen"
          >
            <X className="w-6 h-6" strokeWidth={2.25} />
          </button>
          <Image
            src={src}
            alt={alt}
            width={2400}
            height={1800}
            className="max-w-full max-h-full w-auto h-auto rounded-[10px]"
          />
        </div>
      ) : null}
    </>
  );
}
