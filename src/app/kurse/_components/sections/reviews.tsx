import { Star } from "lucide-react";
import { ReviewsCarousel } from "./reviews-carousel";
import { ReviewsMarquee } from "./reviews-marquee";

export interface PublicReview {
  id: string;
  rating: number;
  firstName: string;
  title: string | null;
  lastInitial: string | null;
  bodyText: string | null;
  submittedAt: string;
  isPinned: boolean;
  courseLabel: string | null;
}

// On desktop the carousel shows 3 cards, so a pinned review sitting at
// position 1 lands at the visible left edge. Marc wants it as the
// second card so it reads as the centered, most-prominent one. On
// mobile (one card per view) first is best, so we keep the DB order
// there. We can't reorder via CSS alone because the carousel hook reads
// cards in DOM order, so we feed two DOM orders and toggle by breakpoint.
function withPinnedSecond(reviews: PublicReview[]): PublicReview[] {
  if (reviews.length < 2) return reviews;
  const pinnedIdx = reviews.findIndex((r) => r.isPinned);
  if (pinnedIdx < 0 || pinnedIdx === 1) return reviews;
  const copy = [...reviews];
  const [pinned] = copy.splice(pinnedIdx, 1);
  copy.splice(1, 0, pinned);
  return copy;
}

interface ReviewsProps {
  // Section heading. Pass null to hide it entirely (home page).
  heading?: string | null;
  reviews: PublicReview[];
  // Continuous marquee with hover-pause instead of the manual
  // snap-scroll carousel. Used on the home page; course landings leave
  // it off.
  autoRotate?: boolean;
  // "rating": big average number + stars (course landings).
  // "proud": the home-page sentence about the average rating.
  summary?: "rating" | "proud";
}

function formatDisplayName(r: PublicReview): string {
  return [r.title, r.firstName, r.lastInitial ? `${r.lastInitial}.` : null]
    .filter(Boolean)
    .join(" ");
}

function StarRow({ rating, size = "md" }: { rating: number; size?: "md" | "lg" }) {
  const dim = size === "lg" ? "h-6 w-6" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} von 5 Sternen`}>
      {[1, 2, 3, 4, 5].map((v) => {
        const active = v <= rating;
        return (
          <Star
            key={v}
            className={dim}
            fill={active ? "#0066FF" : "none"}
            stroke={active ? "#0066FF" : "#D1D5DB"}
            strokeWidth={1.5}
          />
        );
      })}
    </div>
  );
}

export function Reviews({
  heading = "BEWERTUNGEN VON ÄRZT:INNEN",
  reviews,
  autoRotate = false,
  summary = "rating",
}: ReviewsProps) {
  if (reviews.length === 0) return null;

  const avg =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const avgDisplay = avg.toFixed(1).replace(".", ",");
  // Whole averages read cleaner without a trailing ",0" in prose
  // ("5/5" not "5,0/5"); fractional ones keep one decimal with a comma.
  const avgProse = Number.isInteger(avg)
    ? String(avg)
    : avg.toFixed(1).replace(".", ",");
  // Schema spec accepts a single review with rating, but a public-page
  // AggregateRating still needs the rating to be visibly displayed.
  // Both happen here so the JSON-LD in the page.tsx mirrors what users
  // see.

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        {heading && (
          <h2 className="text-3xl md:text-4xl font-bold text-center tracking-wide mb-3">
            {heading}
          </h2>
        )}

        {summary === "proud" ? (
          <p className="max-w-2xl mx-auto text-center text-xl md:text-2xl font-bold text-black/80 mb-10">
            Wir sind super stolz auf eine durchschnittliche Bewertung von{" "}
            {avgProse}/5 Sternen
          </p>
        ) : (
          <div className="flex flex-col items-center gap-2 mb-10">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl md:text-6xl font-bold text-[#0066FF] leading-none">
                {avgDisplay}
              </span>
              <StarRow rating={Math.round(avg)} size="lg" />
            </div>
          </div>
        )}

        {autoRotate ? (
          <ReviewsMarquee items={toItems(reviews)} />
        ) : (
          <>
            {/* Two DOM orders: mobile keeps the pinned review first,
                desktop moves it to second (the centered, most-prominent
                card). Only one is in layout per breakpoint. */}
            <div className="md:hidden">
              <ReviewsCarousel items={toItems(reviews)} />
            </div>
            <div className="hidden md:block">
              <ReviewsCarousel items={toItems(withPinnedSecond(reviews))} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function toItems(reviews: PublicReview[]) {
  return reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    displayName: formatDisplayName(r),
    bodyText: r.bodyText,
    courseLabel: r.courseLabel,
  }));
}
