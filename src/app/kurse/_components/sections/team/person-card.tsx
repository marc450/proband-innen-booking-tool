import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const CORAL = "#BF785E";

export interface PersonCardProps {
  name: string;
  role: string;
  imagePath?: string;
  imageAlt?: string;
  shortBio?: string;
  /**
   * Optional profile link. When set, the entire card becomes a real
   * crawlable anchor pointing at the person's profile page (e.g.
   * `/team/sophia-wilk-vollmann`) and renders a subtle "Vita ansehen →"
   * hint at the bottom. Omit for people without a profile page — the
   * card renders as a static article with no interaction. Using a real
   * `<a href>` (instead of a JS modal) is what makes the vita crawlable
   * and indexable, the EEAT win.
   */
  vita?: {
    label: string;
    href: string;
  };
}

/**
 * Unified person card used for both Dozent:innen and operations team
 * on `/team`. People with a profile page get a subtle inline "Vita
 * ansehen →" hint at the bottom (plus the whole card becomes a link).
 */
export function PersonCard({
  name,
  role,
  imagePath,
  imageAlt,
  shortBio,
  vita,
}: PersonCardProps) {
  const cardClasses = `bg-white rounded-[10px] overflow-hidden flex flex-col group outline-none transition-shadow ${
    vita
      ? "cursor-pointer hover:shadow-lg focus-visible:ring-2 focus-visible:ring-[#0066FF]"
      : ""
  }`;

  const inner = (
    <>
      {imagePath ? (
        <div
          className="relative w-full bg-black/5 overflow-hidden"
          style={{ aspectRatio: "1 / 1" }}
        >
          <Image
            src={imagePath}
            alt={imageAlt ?? name}
            fill
            quality={85}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover object-[center_30%] transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      ) : (
        <div
          className="w-full flex items-center justify-center"
          style={{ aspectRatio: "1 / 1", backgroundColor: CORAL }}
          aria-hidden="true"
        >
          <span className="text-white/90 text-xs font-semibold tracking-[0.2em]">
            EPHIA
          </span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-6 md:p-7">
        {/* Name is intentionally NOT using TYPO.h3 here — card width is
            ~260px after padding and even the widest name (Dr. Sophia
            Wilk‑Vollmann) must fit on one line. whitespace-nowrap forces
            single-line rendering; the font size below is tuned so that
            widest name still fits. */}
        <h3 className="text-lg md:text-xl font-bold tracking-wide leading-tight text-black whitespace-nowrap">
          {name}
        </h3>
        <p className="mt-1 text-sm md:text-base font-semibold text-[#0066FF]">
          {role}
        </p>

        {shortBio && (
          <p className="text-sm md:text-base text-black/75 leading-relaxed mt-4 flex-1">
            {shortBio}
          </p>
        )}

        {vita && (
          <div
            className={`${shortBio ? "mt-5" : "mt-6"} flex items-center gap-1.5 text-sm font-semibold text-[#0066FF] group-hover:text-[#0055DD] transition-colors`}
          >
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
    </>
  );

  if (vita) {
    return (
      <Link
        href={vita.href}
        aria-label={`Profil von ${name} ansehen`}
        className={cardClasses}
      >
        {inner}
      </Link>
    );
  }

  return <article className={cardClasses}>{inner}</article>;
}
