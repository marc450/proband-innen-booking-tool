"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { TYPO } from "../../typography";

const CORAL = "#BF785E";

export interface PersonCardProps {
  name: string;
  role: string;
  imagePath?: string;
  imageAlt?: string;
  shortBio?: string;
  /**
   * Optional vita trigger. When set, the entire card becomes clickable
   * (role="button") and renders a subtle "Vita ansehen →" link at the
   * bottom of the body. Omit for people without a curriculum — the card
   * renders as a static article with no interaction.
   */
  vita?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Unified person card used for both Dozent:innen and operations team
 * on `/kurse/team`. The only visual difference between a Dozent:in card
 * and a regular team card is a subtle inline "Vita ansehen →" hint at
 * the bottom (plus a cursor-pointer on hover). No giant CTA buttons.
 */
export function PersonCard({
  name,
  role,
  imagePath,
  imageAlt,
  shortBio,
  vita,
}: PersonCardProps) {
  const clickable = Boolean(vita);

  const handleClick = () => {
    vita?.onClick();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!vita) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      vita.onClick();
    }
  };

  return (
    <article
      onClick={clickable ? handleClick : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `Vita von ${name} ansehen` : undefined}
      className={`bg-white rounded-[10px] flex flex-col items-center text-center p-6 md:p-7 group outline-none transition-shadow ${
        clickable
          ? "cursor-pointer hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[#0066FF]"
          : ""
      }`}
    >
      {imagePath ? (
        <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden bg-black/5 shrink-0">
          <Image
            src={imagePath}
            alt={imageAlt ?? name}
            fill
            quality={85}
            sizes="112px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        </div>
      ) : (
        <div
          className="w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: CORAL }}
          aria-hidden="true"
        >
          <span className="text-white/90 text-[0.6rem] font-semibold tracking-[0.2em]">
            EPHIA
          </span>
        </div>
      )}

      <div className="flex flex-col flex-1 items-center mt-4 w-full">
        <h3 className={`${TYPO.h3} text-black`}>{name}</h3>
        <p className="mt-1 text-sm font-semibold text-[#0066FF]">
          {role}
        </p>

        {shortBio && (
          <p className={`${TYPO.bodyCard} mt-3 flex-1`}>{shortBio}</p>
        )}

        {vita && (
          <div className={`${shortBio ? "mt-4" : "mt-5"} flex items-center gap-1.5 text-sm font-semibold text-[#0066FF] group-hover:text-[#0055DD] transition-colors`}>
            <span className="underline underline-offset-4 decoration-[#0066FF]/30 group-hover:decoration-[#0055DD]">
              {vita.label}
            </span>
            <ArrowRight
              className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    </article>
  );
}
