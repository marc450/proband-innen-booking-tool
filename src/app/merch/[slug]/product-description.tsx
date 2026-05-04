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
// long paragraph still gets cut off. With the hard-cut algorithm
// below, the actual rendered preview is reliably close to this number
// (no more "give up if the next paragraph would overflow"), so the
// constant maps directly to vertical height in the text column.
// Tuned so the CTA on /merch/[slug] lands close to the bottom edge
// of the thumbnail strip on the right.
const PREVIEW_CHAR_TARGET = 400;

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

  // Build the preview: add whole paragraphs while we still have budget,
  // and hard-cut the next paragraph at a word boundary if it alone would
  // overflow. The previous algorithm bailed out as soon as a paragraph
  // wouldn't fit, which made the preview way too short whenever the
  // admin input had inconsistent paragraph breaks (a single short
  // intro line followed by a huge wall-of-text paragraph). Hard-cutting
  // keeps the preview visually balanced regardless of input shape.
  const preview: string[] = [];
  let charCount = 0;
  let truncatedLast = false;
  for (const para of paragraphs) {
    const remaining = PREVIEW_CHAR_TARGET - charCount;
    if (remaining <= 0) break;
    if (para.length <= remaining) {
      preview.push(para);
      charCount += para.length;
      continue;
    }
    // Doesn't fit whole — hard-cut at the nearest word boundary, but
    // only if that boundary is at least halfway into the remaining
    // budget (otherwise we waste too much to a long unbroken token).
    const slice = para.slice(0, remaining);
    const lastSpace = slice.lastIndexOf(" ");
    const cutAt = lastSpace > remaining * 0.5 ? lastSpace : remaining;
    preview.push(para.slice(0, cutAt).trimEnd());
    truncatedLast = true;
    break;
  }

  const hasMore = truncatedLast || preview.length < paragraphs.length;

  return (
    <>
      <div className="mt-5 text-base md:text-lg text-black/75 leading-relaxed max-w-xl space-y-4">
        {preview.map((para, i) => (
          <p key={i} className="whitespace-pre-line">
            {i === preview.length - 1 && hasMore ? (
              <>
                {para}
                {truncatedLast ? "…" : ""}{" "}
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
