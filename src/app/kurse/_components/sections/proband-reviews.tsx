import { Star } from "lucide-react";
import { TYPO } from "../typography";
import { ProbandReviewsCarousel } from "./proband-reviews-carousel";

/**
 * Proband:innen-Bewertungen auf der werde-proband-in Landingpage.
 *
 * Quelle: `proband_reviews` (Migration 123). Es werden ausschließlich
 * Reviews mit `is_published = true` angezeigt — die Staff-Moderation in
 * /dashboard/auszubildende/bewertungen flippt das Flag. Empty-safe:
 * solange noch keine Bewertung freigegeben ist, rendert die Sektion
 * gar nichts (kein „Noch keine Bewertungen"-Platzhalter, damit die
 * Landingpage nicht leerer wirkt als sie ist).
 *
 * Layout: weiße Karten auf Rose-Hintergrund (Brand-Konsistenz mit
 * /kurse-Testimonials). Karten laufen als horizontaler Snap-Carousel
 * mit Pfeil-Buttons (Desktop) und Dot-Indicators (alle Viewports),
 * gleiche Mechanik wie die Ärzt:innen-Reviews auf /kurse/[slug].
 */

const PRIMARY = "#0066FF";

export interface ProbandReviewItem {
  id: string;
  rating: number;
  firstName: string;
  body: string;
}

interface ProbandReviewsProps {
  reviews: ProbandReviewItem[];
  /** Gesamtzahl freigegebener Bewertungen, kann > reviews.length sein
   *  weil die Landingpage nur eine Auswahl zeigt. */
  totalCount: number;
  /** Durchschnittsbewertung über alle freigegebenen Reviews. */
  averageRating: number;
}

function formatAverage(value: number): string {
  // Deutsche Schreibweise: Komma als Dezimaltrenner, eine Nachkommastelle.
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function StarRow({ rating, label }: { rating: number; label: string }) {
  const safe = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={label}
    >
      {[1, 2, 3, 4, 5].map((v) => {
        const active = v <= safe;
        return (
          <Star
            key={v}
            className="h-4 w-4"
            strokeWidth={1.5}
            style={{
              color: active ? PRIMARY : "#D1D5DB",
              fill: active ? PRIMARY : "none",
            }}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

export function ProbandReviews({
  reviews,
  totalCount,
  averageRating,
}: ProbandReviewsProps) {
  if (reviews.length === 0) return null;

  return (
    <section
      id="bewertungen"
      className="bg-[#FAEBE1] py-16 md:py-20 scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="text-center mb-10 md:mb-12 max-w-2xl mx-auto">
          <h2 className={`${TYPO.h2} text-black`}>
            Das sagen unsere Proband:innen
          </h2>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <StarRow
              rating={averageRating}
              label={`Durchschnitt ${formatAverage(averageRating)} von 5 Sternen`}
            />
            <span className="text-sm md:text-base text-black/75">
              <strong className="font-bold text-black">
                {formatAverage(averageRating)} / 5
              </strong>{" "}
              aus{" "}
              <strong className="font-bold text-black">{totalCount}</strong>{" "}
              {totalCount === 1 ? "Bewertung" : "Bewertungen"}
            </span>
          </div>
        </div>

        <ProbandReviewsCarousel reviews={reviews} />
      </div>
    </section>
  );
}
