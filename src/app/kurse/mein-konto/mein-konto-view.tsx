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
//      "Zum Kurs →" CTA out to LW. Progress bar pulls from the LW
//      v2 API (one call per page load) when the customer has an
//      lw_user_id set on auszubildende.
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
  // Online-only: % completion from the LW v2 API. Null when the
  // customer has no lw_user_id, when the course doesn't appear in
  // their LW enrollments, or when the LW API call failed (we fall
  // back to a card without a progress bar instead of failing the
  // whole page).
  progressPct?: number | null;
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

// Date-only strings ("YYYY-MM-DD") would otherwise be parsed as UTC
// midnight, which shifts to the previous day for any viewer west of
// Greenwich. Anchor at local noon so the day/weekday/month read true
// in every timezone.
function parseDateOnly(iso: string): Date {
  return new Date(iso + "T12:00:00");
}

function formatLongDate(iso: string | null): string | null {
  if (!iso) return null;
  return parseDateOnly(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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
  const date = booking.courseDate ? parseDateOnly(booking.courseDate) : null;
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

      {/* Right: details. Title + session details + soft prereq +
          single Proband-Buddy CTA. We removed the Praxiskurs / "in N
          Tagen" pills (date already on the tear-off, type implied by
          this whole section being titled "Anstehende Termine") and
          the "Zum Kurs" CTA (the Praxiskurs is an in-person event,
          not an LW page worth opening). */}
      <div className="flex flex-col flex-1 p-6 md:p-8 gap-3">
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

        {/* Soft prereq reminder — guidance only, not enforced. The
            online theory course must be completed before the
            in-person session so the customer can practice on the day
            instead of catching up on basics. */}
        <p className="text-sm text-black/70 leading-relaxed">
          <span className="font-medium text-black">Bitte beachte:</span> Schließe
          den dazugehörigen Onlinekurs vor Deinem Praxistermin ab.
        </p>

        <p className="text-sm text-black/70 leading-relaxed">
          Bring eine:n Freund:in mit als Proband:in. Optional, aber sehr beliebt.
        </p>

        <div className="mt-2">
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

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const label =
    clamped === 0
      ? "Noch nicht gestartet"
      : clamped >= 100
        ? "Abgeschlossen"
        : `${Math.round(clamped)}% abgeschlossen`;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-black/60 font-medium">{label}</span>
        <span className="text-black/40 tabular-nums">{Math.round(clamped)}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#0066FF] transition-[width] duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

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

        {/* Spacer pushes the progress + CTA to the bottom of the card. */}
        <div className="flex-1" />

        {/* Progress bar lights up when LW returned a percent for this
            course. We render it for any value 0..100 (including 0) so
            customers see "you haven't started yet" as an empty bar
            rather than nothing. We hide the bar entirely only when
            progressPct is null/undefined (no data available). */}
        {typeof booking.progressPct === "number" && (
          <ProgressBar pct={booking.progressPct} />
        )}

        {booking.lwHref ? (
          <a
            href={booking.lwHref}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center w-full text-sm md:text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3 transition-colors"
          >
            {/* CTA reads progress when we have it, falls back to a
                neutral label otherwise:
                  100   → Zum Kurs (review / certificate)
                  1..99 → Weiterlernen (resume)
                  0     → Kurs starten (first click)
                  null  → Zum Kurs (no progress data; don't guess) */}
            {booking.progressPct === 100
              ? "Zum Kurs →"
              : typeof booking.progressPct === "number" &&
                  booking.progressPct > 0
                ? "Weiterlernen →"
                : booking.progressPct === 0
                  ? "Kurs starten →"
                  : "Zum Kurs →"}
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
