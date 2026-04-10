"use client";

import { useEffect, useState } from "react";
import { X, ZoomIn } from "lucide-react";

interface ExpandableMediaProps {
  mediaPath: string;
  mediaPoster?: string;
  title: string;
}

function isVideoPath(path: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(path);
}

export function ExpandableMedia({
  mediaPath,
  mediaPoster,
  title,
}: ExpandableMediaProps) {
  const [open, setOpen] = useState(false);
  const video = isVideoPath(mediaPath);

  // Close on ESC + lock body scroll while open
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${title} vergrößern`}
        className="group relative rounded-[10px] overflow-hidden bg-black/5 aspect-[4/3] w-full block cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2"
      >
        {video ? (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            poster={mediaPoster}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src={mediaPath} type="video/mp4" />
          </video>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaPath}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        )}

        {/* Hover hint */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/65 text-white backdrop-blur-sm px-3 py-1.5 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ZoomIn className="w-3.5 h-3.5" />
          <span>Vergrößern</span>
        </div>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 md:p-10 animate-in fade-in duration-200"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="Schließen"
            className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center justify-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center"
          >
            {video ? (
              <video
                className="max-w-[95vw] max-h-[90vh] rounded-[10px]"
                poster={mediaPoster}
                autoPlay
                loop
                playsInline
                controls
              >
                <source src={mediaPath} type="video/mp4" />
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaPath}
                alt={title}
                className="max-w-[95vw] max-h-[90vh] object-contain rounded-[10px]"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
