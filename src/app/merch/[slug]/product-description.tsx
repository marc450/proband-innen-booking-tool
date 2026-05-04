"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Props {
  /** Raw description text from the merch_products row. May contain
   *  blank-line paragraph breaks the admin typed in the editor. */
  text: string;
}

// How much description to show inline before truncating. Characters,
// not paragraphs — counted across the whole text — so a single very
// long paragraph still gets cut off. The first paragraph break beyond
// this point is the actual cut.
const PREVIEW_CHAR_TARGET = 240;

/**
 * Renders a product Beschreibung with a "...mehr lesen" link. Click
 * opens a modal with the full text in a scrollable container. Used on
 * the /merch/[slug] page where the description can be long enough to
 * dominate the layout when shown in full.
 *
 * Truncation rule: keep the first paragraph that fits inside
 * PREVIEW_CHAR_TARGET. If the very first paragraph is already longer,
 * we cut it at the next sentence/word boundary so the preview doesn't
 * dwarf the rest of the column.
 */
export function ProductDescription({ text }: Props) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the modal is open (cheap; no scroll-lock
  // library) and close on Escape. Declared before any early return so
  // the hook is always called in the same order, regardless of whether
  // the description happens to be empty.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  // Build the preview: keep adding paragraphs until we'd exceed the
  // target. If the first paragraph alone exceeds it, hard-cut on the
  // nearest space before the limit and append an ellipsis.
  const preview: string[] = [];
  let charCount = 0;
  let truncatedFirst = false;
  for (const para of paragraphs) {
    if (charCount === 0 && para.length > PREVIEW_CHAR_TARGET) {
      const slice = para.slice(0, PREVIEW_CHAR_TARGET);
      const lastSpace = slice.lastIndexOf(" ");
      preview.push(slice.slice(0, lastSpace > 0 ? lastSpace : slice.length).trimEnd());
      truncatedFirst = true;
      break;
    }
    if (charCount + para.length > PREVIEW_CHAR_TARGET && preview.length > 0) {
      break;
    }
    preview.push(para);
    charCount += para.length;
  }

  const hasMore = truncatedFirst || preview.length < paragraphs.length;

  return (
    <>
      <div className="mt-5 text-base md:text-lg text-black/75 leading-relaxed max-w-xl space-y-4">
        {preview.map((para, i) => (
          <p key={i} className="whitespace-pre-line">
            {i === preview.length - 1 && hasMore ? (
              <>
                {para}
                {truncatedFirst ? "…" : ""}{" "}
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="text-[#0066FF] font-medium hover:underline cursor-pointer"
                >
                  mehr lesen
                </button>
              </>
            ) : (
              para
            )}
          </p>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-white rounded-[10px] w-full max-w-xl max-h-[85vh] flex flex-col relative">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="overflow-y-auto px-6 md:px-8 py-8 space-y-4 text-base text-black/80 leading-relaxed">
              {paragraphs.map((para, i) => (
                <p key={i} className="whitespace-pre-line">
                  {para}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
