import { MapPin, Train, ArrowUpRight } from "lucide-react";
import type { CourseLocationContent } from "@/content/kurse/types";

export function LocationInfo({ content }: { content: CourseLocationContent }) {
  const fullAddress = `${content.street}, ${content.postalCode} ${content.city}`;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    content.mapsQuery || `${content.venueName} ${fullAddress}`,
  )}`;

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-5xl mx-auto px-5 md:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-left md:text-center tracking-wide mb-10 md:mb-14">
          {content.heading}
        </h2>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Venue / address card */}
          <div className="bg-[#FAEBE1] rounded-[10px] p-6 md:p-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-[10px] bg-[#0066FF]/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-[#0066FF]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#0066FF] mb-1">
                  Kursort
                </p>
                <h3 className="text-xl font-bold">{content.venueName}</h3>
              </div>
            </div>
            <address className="not-italic text-base text-black/80 leading-relaxed mb-4">
              {content.street}
              <br />
              {content.postalCode} {content.city}
              {content.district && (
                <>
                  <br />
                  <span className="text-black/60">{content.district}</span>
                </>
              )}
            </address>
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0066FF] hover:underline"
            >
              In Google Maps öffnen
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>

          {/* Transit card */}
          <div className="bg-[#FAEBE1] rounded-[10px] p-6 md:p-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-[10px] bg-[#0066FF]/10 flex items-center justify-center flex-shrink-0">
                <Train className="w-5 h-5 text-[#0066FF]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#0066FF] mb-1">
                  Anfahrt
                </p>
                <h3 className="text-xl font-bold">Öffentlicher Nahverkehr</h3>
              </div>
            </div>
            <ul className="space-y-2 text-base text-black/80 leading-relaxed">
              {content.transit.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span
                    className="mt-2 w-1.5 h-1.5 rounded-full bg-[#0066FF] flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {content.paragraphs.length > 0 && (
          <div className="max-w-3xl mx-auto mt-10 md:mt-14 space-y-4 text-base md:text-[17px] text-black/80 leading-relaxed">
            {content.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        {content.whyHeading && content.whyParagraphs && content.whyParagraphs.length > 0 && (
          <div className="max-w-3xl mx-auto mt-10 md:mt-14">
            <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-4 text-[#733D29]">
              {content.whyHeading}
            </h3>
            <div className="space-y-4 text-base md:text-[17px] text-black/80 leading-relaxed">
              {content.whyParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
