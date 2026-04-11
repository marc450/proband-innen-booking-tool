import Image from "next/image";
import { TYPO } from "../../typography";

const CORAL = "#BF785E";

export interface PersonCardProps {
  name: string;
  role: string;
  imagePath?: string;
  imageAlt?: string;
  shortBio?: string;
  /** CTA button at the bottom of the card. Omit to render a card without a CTA. */
  cta?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    disabledLabel?: string;
  };
}

/**
 * Unified person card used across the `/kurse/team` page for
 * Dozent:innen, the operations team, and the review board.
 * Same visual treatment everywhere — the only difference is
 * whether a CTA button sits at the bottom to open a vita modal.
 */
export function PersonCard({
  name,
  role,
  imagePath,
  imageAlt,
  shortBio,
  cta,
}: PersonCardProps) {
  const disabled = cta?.disabled ?? false;

  return (
    <article className="bg-white rounded-[10px] overflow-hidden flex flex-col group">
      {imagePath ? (
        <div className="relative aspect-[4/5] bg-black/5 overflow-hidden">
          <Image
            src={imagePath}
            alt={imageAlt ?? name}
            fill
            quality={85}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      ) : (
        <div
          className="aspect-[4/5] flex items-center justify-center"
          style={{ backgroundColor: CORAL }}
          aria-hidden="true"
        >
          <span className="text-white/90 text-xs font-semibold tracking-[0.2em]">
            EPHIA
          </span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-6 md:p-7">
        <h3 className={`${TYPO.h3} text-black`}>{name}</h3>
        <p className="mt-1 text-sm md:text-base font-semibold text-[#0066FF]">
          {role}
        </p>

        {shortBio && (
          <p className={`${TYPO.bodyCard} mt-4 mb-6 flex-1`}>{shortBio}</p>
        )}

        {cta && (
          <div className={shortBio ? "" : "mt-6"}>
            <button
              type="button"
              onClick={cta.onClick}
              disabled={disabled}
              className="w-full text-sm md:text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {disabled ? cta.disabledLabel ?? cta.label : cta.label}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
