"use client";

import Image from "next/image";

// Customer-facing dashboard view. The page (server component) hands us
// a list of `EnrichedBooking` rows with image_url + display_title
// already resolved against course_templates, so this view is purely
// presentational. Sign-out lives in the header CTA on /mein-konto;
// we don't render an in-page Abmelden button here.

export interface EnrichedBooking {
  id: string;
  productName: string;
  displayTitle: string;
  courseType: "Onlinekurs" | "Praxiskurs" | "Kombikurs" | "Hybrid" | "Merch" | "Kurs";
  courseDate: string | null;
  purchasedAt: string | null;
  source: string | null;
  imageUrl: string | null;
  lwHref: string | null;
}

interface Props {
  firstName: string | null;
  bookings: EnrichedBooking[];
}

const CORAL = "#BF785E";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function MeinKontoView({ firstName, bookings }: Props) {
  return (
    <div className="min-h-[60vh] px-5 md:px-8 pt-12 pb-24">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
          Hi {firstName ?? "Du"}
        </h1>

        <h2 className="text-lg font-bold text-black mt-10 mb-6">
          Deine Kurse
        </h2>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-[10px] shadow-sm p-6 text-center text-sm text-black/70">
            Wir haben aktuell keine Kursbuchungen unter dieser E-Mail.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}

        <p className="text-xs text-black/50 mt-12 text-center">
          Die direkte Kurs-Anzeige und Lernfortschritt aus LearnWorlds folgen in den nächsten Tagen.
        </p>
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: EnrichedBooking }) {
  const dateLabel = booking.courseDate
    ? `Kursdatum: ${formatDate(booking.courseDate)}`
    : booking.purchasedAt
    ? `Gekauft: ${formatDate(booking.purchasedAt)}`
    : null;

  return (
    <article className="bg-white rounded-[10px] overflow-hidden flex flex-col group shadow-sm">
      {booking.imageUrl ? (
        <div className="relative aspect-[4/3] bg-black/5 overflow-hidden">
          <Image
            src={booking.imageUrl}
            alt={booking.displayTitle}
            fill
            quality={85}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      ) : (
        <div
          className="aspect-[4/3] flex items-center justify-center"
          style={{ backgroundColor: CORAL }}
          aria-hidden="true"
        >
          <span className="text-white/90 text-xs font-semibold tracking-[0.2em]">
            {booking.courseType.toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-6 md:p-8">
        <h3 className="text-xl md:text-2xl font-bold tracking-wide leading-tight text-black text-balance">
          {booking.displayTitle}
        </h3>

        <div className="flex flex-wrap items-center gap-1.5 mt-4">
          <span className="text-[11px] font-semibold tracking-wide rounded-full px-2.5 py-1 bg-[#0066FF] text-white">
            {booking.courseType}
          </span>
          {dateLabel && (
            <span className="text-[11px] font-semibold tracking-wide rounded-full px-2.5 py-1 bg-black/5 text-black/70">
              {dateLabel}
            </span>
          )}
        </div>

        {/* Spacer so the CTA sticks to the bottom of the card. */}
        <div className="flex-1" />

        <div className="mt-6">
          {booking.lwHref ? (
            <a
              href={booking.lwHref}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center w-full text-sm md:text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3 transition-colors"
            >
              Zum Kurs →
            </a>
          ) : (
            <span className="block text-center w-full text-sm font-medium text-black/50 bg-black/[0.04] rounded-[10px] px-5 py-3">
              Aus historischer Buchung
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
