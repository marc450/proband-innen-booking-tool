import { Star } from "lucide-react";
import { ReviewsCarousel } from "./reviews-carousel";

export interface PublicReview {
  id: string;
  rating: number;
  firstName: string;
  title: string | null;
  lastInitial: string | null;
  bodyText: string | null;
  submittedAt: string;
  courseLabel: string | null;
}

interface ReviewsProps {
  heading?: string;
  reviews: PublicReview[];
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

export function Reviews({ heading = "BEWERTUNGEN VON ÄRZT:INNEN", reviews }: ReviewsProps) {
  if (reviews.length === 0) return null;

  const avg =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const avgDisplay = avg.toFixed(1).replace(".", ",");
  // Schema spec accepts a single review with rating, but a public-page
  // AggregateRating still needs the rating to be visibly displayed.
  // Both happen here so the JSON-LD in the page.tsx mirrors what users
  // see.

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center tracking-wide mb-3">
          {heading}
        </h2>

        <div className="flex flex-col items-center gap-2 mb-10">
          <div className="flex items-baseline gap-3">
            <span className="text-5xl md:text-6xl font-bold text-[#0066FF] leading-none">
              {avgDisplay}
            </span>
            <StarRow rating={Math.round(avg)} size="lg" />
          </div>
          <p className="text-sm md:text-base text-black/70">
            basierend auf {reviews.length}{" "}
            {reviews.length === 1 ? "verifizierten Bewertung" : "verifizierten Bewertungen"}
          </p>
        </div>

        <ReviewsCarousel
          items={reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            displayName: formatDisplayName(r),
            bodyText: r.bodyText,
            courseLabel: r.courseLabel,
          }))}
        />
      </div>
    </section>
  );
}
