"use client";

import { useState } from "react";
import Image from "next/image";

// Customer-facing dashboard view.
//
// Three sections, in priority order:
//   1. Anstehende Termine — Praxis/Kombi/Hybrid bookings whose date is
//      in the future. Each renders as a hero card with a date block,
//      title + image, and the Proband-Buddy CTA (no reschedule per
//      product decision).
//   2. Deine Onlinekurse — image cards in a 1/2/3-col grid. Single
//      "Zum Kurs →" CTA out to LW. Progress bar is a placeholder
//      until v3 wires up the LW API.
//   3. Abgeschlossen — compact list rows. "Past attendance is assumed"
//      rule applies: anything past + not cancelled is rendered as
//      participated.
//
// Sign-out lives in the header CTA on /mein-konto, not on this page.

export type CourseType =
  | "Onlinekurs"
  | "Praxiskurs"
  | "Kombikurs"
  | "Hybrid"
  | "Merch"
  | "Kurs";

export interface EnrichedBooking {
  id: string;
  productName: string;
  displayTitle: string;
  courseType: CourseType;
  courseDate: string | null;
  purchasedAt: string | null;
  source: string | null;
  imageUrl: string | null;
  lwHref: string | null;
  // Populated for Praxiskurs cards sourced from course_bookings +
  // course_sessions. Legacy bookings pre-date the structured-session
  // schema and leave these null.
  location: string | null;
  startTime: string | null;
  instructor: string | null;
}

interface Props {
  firstName: string | null;
  upcoming: EnrichedBooking[];
  online: EnrichedBooking[];
  done: EnrichedBooking[];
}

const CORAL = "#BF785E";
const PROBAND_FUNNEL_URL = "https://proband-innen.ephia.de/";

const MONTHS_DE = [
  "Jan",
  "Feb",
  "März",
  "Apr",
  "Mai",
  "Juni",
  "Juli",
  "Aug",
  "Sept",
  "Okt",
  "Nov",
  "Dez",
];

const WEEKDAYS_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function formatLongDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(iso: string): number {
  const target = new Date(iso);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function inDaysLabel(iso: string): string {
  const n = daysUntil(iso);
  if (n === 0) return "Heute";
  if (n === 1) return "Morgen";
  return `In ${n} Tagen`;
}

export function MeinKontoView({ firstName, upcoming, online, done }: Props) {
  const [probandOpen, setProbandOpen] = useState(false);
  const empty = upcoming.length === 0 && online.length === 0 && done.length === 0;

  return (
    // Match the kurse header's container: max-w-7xl with px-5 md:px-8
    // INSIDE the max-width box, so the content edge lines up with the
    // nav links instead of extending 40-64px past them.
    <div className="min-h-[60vh] pt-12 pb-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
          Hi {firstName ?? "Du"}
        </h1>

        {empty && (
          <div className="bg-white rounded-[10px] shadow-sm p-8 mt-10 text-center">
            <p className="text-sm text-black/70">
              Wir haben aktuell keine Kursbuchungen unter dieser E-Mail. Schau Dich gerne in unseren Kursen um.
            </p>
            <a
              href="/unsere-kurse"
              className="inline-block mt-5 bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-sm rounded-[10px] px-5 py-3 transition-colors"
            >
              Kurse ansehen →
            </a>
          </div>
        )}

        {upcoming.length > 0 && (
          <Section title="Anstehende Termine" count={upcoming.length}>
            <div className="space-y-5">
              {upcoming.map((b) => (
                <UpcomingCard
                  key={b.id}
                  booking={b}
                  onProbandClick={() => setProbandOpen(true)}
                />
              ))}
            </div>
          </Section>
        )}

        {online.length > 0 && (
          <Section title="Deine Onlinekurse" count={online.length}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {online.map((b) => (
                <OnlineCard key={b.id} booking={b} />
              ))}
            </div>
          </Section>
        )}

        {done.length > 0 && (
          <Section title="Abgeschlossen" count={done.length}>
            <ul className="bg-white rounded-[10px] shadow-sm divide-y divide-black/[0.06]">
              {done.map((b) => (
                <DoneRow key={b.id} booking={b} />
              ))}
            </ul>
          </Section>
        )}

        {!empty && (
          <p className="text-xs text-black/50 mt-12 text-center">
            Lernfortschritt und Zertifikate aus LearnWorlds folgen in den nächsten Tagen.
          </p>
        )}
      </div>

      <ProbandBuddyDialog open={probandOpen} onClose={() => setProbandOpen(false)} />
    </div>
  );
}

/* ─────────────────────── Section header ─────────────────────── */

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-black mb-5 flex items-baseline gap-2">
        {title}
        <span className="text-xs font-medium text-black/40">{count}</span>
      </h2>
      {children}
    </section>
  );
}

/* ──────────────── Upcoming Praxis/Kombi hero card ──────────────── */

function UpcomingCard({
  booking,
  onProbandClick,
}: {
  booking: EnrichedBooking;
  onProbandClick: () => void;
}) {
  const date = booking.courseDate ? new Date(booking.courseDate) : null;
  const dayNum = date?.getDate();
  const monthLabel = date ? MONTHS_DE[date.getMonth()] : null;
  const weekdayLabel = date ? WEEKDAYS_DE[date.getDay()] : null;

  return (
    <article className="bg-white rounded-[10px] shadow-sm overflow-hidden flex flex-col md:flex-row">
      {/* Left: date tear-off */}
      {date && (
        <div
          className="flex md:flex-col items-center justify-center px-6 md:px-8 py-5 md:py-6 md:min-w-[160px] gap-3 md:gap-1 text-white"
          style={{ backgroundColor: CORAL }}
        >
          <span className="text-xs font-bold tracking-[0.2em] uppercase opacity-90">
            {weekdayLabel}
          </span>
          <span className="text-4xl md:text-5xl font-bold leading-none tabular-nums">
            {dayNum}
          </span>
          <span className="text-xs font-bold tracking-[0.15em] uppercase opacity-90">
            {monthLabel}
          </span>
        </div>
      )}

      {/* Right: details */}
      <div className="flex flex-col flex-1 p-6 md:p-8 gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold tracking-wide rounded-full px-2.5 py-1 bg-[#0066FF] text-white">
            {booking.courseType}
          </span>
          {booking.courseDate && (
            <span className="text-[11px] font-semibold tracking-wide rounded-full px-2.5 py-1 bg-black/5 text-black/70">
              {inDaysLabel(booking.courseDate)}
            </span>
          )}
        </div>

        <h3 className="text-xl md:text-2xl font-bold tracking-wide leading-tight text-black text-balance">
          {booking.displayTitle}
        </h3>

        {(booking.startTime || booking.location || booking.instructor) && (
          <ul className="text-sm text-black/70 leading-relaxed space-y-0.5">
            {booking.startTime && (
              <li>
                <span className="font-medium text-black">Start:</span> {booking.startTime.slice(0, 5)} Uhr
              </li>
            )}
            {booking.instructor && (
              <li>
                <span className="font-medium text-black">Dozent:in:</span> {booking.instructor}
              </li>
            )}
            {booking.location && (
              <li>
                <span className="font-medium text-black">Ort:</span> {booking.location}
              </li>
            )}
          </ul>
        )}

        <p className="text-sm text-black/70 leading-relaxed">
          Bring eine:n Freund:in mit als Proband:in. Optional, aber sehr beliebt.
        </p>

        <div className="mt-2 flex flex-col sm:flex-row gap-3">
          {booking.lwHref && (
            <a
              href={booking.lwHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center text-sm md:text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3 transition-colors"
            >
              Zum Kurs →
            </a>
          )}
          <button
            type="button"
            onClick={onProbandClick}
            className="inline-flex items-center justify-center text-sm md:text-base font-bold text-[#0066FF] border border-[#0066FF] hover:bg-[#0066FF]/10 rounded-[10px] px-5 py-3 transition-colors"
          >
            Proband:in einladen
          </button>
        </div>
      </div>
    </article>
  );
}

/* ──────────────── Online course tile ──────────────── */

function OnlineCard({ booking }: { booking: EnrichedBooking }) {
  return (
    <article className="bg-white rounded-[10px] overflow-hidden flex flex-col group shadow-sm">
      {booking.imageUrl ? (
        <div className="relative aspect-[4/3] bg-black/5 overflow-hidden">
          <Image
            src={booking.imageUrl}
            alt={booking.displayTitle}
            fill
            quality={85}
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
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
            ONLINEKURS
          </span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-6 gap-3">
        <h3 className="text-lg md:text-xl font-bold tracking-wide leading-tight text-black text-balance">
          {booking.displayTitle}
        </h3>

        {/* Spacer pushes the CTA to the bottom of the card. The progress
            bar is a placeholder for v3 once we have the LW API call. */}
        <div className="flex-1" />

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
            Kurs nicht verfügbar
          </span>
        )}
      </div>
    </article>
  );
}

/* ──────────────── Done row (compact) ──────────────── */

function DoneRow({ booking }: { booking: EnrichedBooking }) {
  const dateLabel = booking.courseDate
    ? `Teilgenommen am ${formatLongDate(booking.courseDate)}`
    : booking.purchasedAt
    ? `Gekauft am ${formatLongDate(booking.purchasedAt)}`
    : null;

  return (
    <li className="px-5 md:px-6 py-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-black truncate">
          {booking.displayTitle}
        </p>
        <p className="text-xs text-black/60 mt-0.5">
          {booking.courseType}
          {dateLabel ? ` · ${dateLabel}` : ""}
        </p>
      </div>
      {booking.lwHref && (
        <a
          href={booking.lwHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-[#0066FF] hover:underline shrink-0"
        >
          Zum Kurs →
        </a>
      )}
    </li>
  );
}

/* ──────────────── Proband-Buddy dialog ──────────────── */

function ProbandBuddyDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const shareMessage = `Ich nehme an einem Ausbildungskurs bei EPHIA teil und darf eine:n Proband:in mitbringen, an der/dem ich behandle. Lust mitzukommen? Mehr Infos und Anmeldung als Proband:in: ${PROBAND_FUNNEL_URL}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(PROBAND_FUNNEL_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API not available — fall back silently.
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Proband:in einladen"
    >
      <div
        className="bg-white rounded-[10px] shadow-xl w-full max-w-md p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-black mb-3">Bring eine:n Freund:in mit als Proband:in.</h3>
        <p className="text-sm text-black/70 leading-relaxed mb-5">
          Im Kurs darf jede:r Auszubildende eine:n Proband:in mitbringen, an der/dem behandelt wird. Optional, aber sehr beliebt. Du hast bereits eine entsprechende E-Mail von uns dazu erhalten.
        </p>

        <p className="text-xs font-semibold text-black/60 mb-2">
          Link zur Proband:innen-Anmeldung
        </p>
        <div className="flex items-center gap-2 mb-5">
          <input
            readOnly
            value={PROBAND_FUNNEL_URL}
            className="flex-1 bg-[#FAEBE1] rounded-[10px] px-4 py-3 text-sm text-black/80 focus:outline-none"
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={copyLink}
            className="text-sm font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-4 py-3 transition-colors shrink-0"
          >
            {copied ? "Kopiert" : "Kopieren"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-sm font-bold text-[#0066FF] border border-[#0066FF] hover:bg-[#0066FF]/10 rounded-[10px] px-4 py-3 transition-colors"
          >
            Per WhatsApp teilen
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent("Lust auf eine Behandlung als Proband:in?")}&body=${encodeURIComponent(shareMessage)}`}
            className="flex-1 text-center text-sm font-bold text-[#0066FF] border border-[#0066FF] hover:bg-[#0066FF]/10 rounded-[10px] px-4 py-3 transition-colors"
          >
            Per E-Mail teilen
          </a>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="block w-full text-center mt-5 text-sm font-medium text-black/50 hover:text-black transition-colors"
        >
          Schließen
        </button>
      </div>
    </div>
  );
}
