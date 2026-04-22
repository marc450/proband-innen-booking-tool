"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Award, Compass, Trophy } from "lucide-react";

export interface LernpfadStep {
  /** Step number, displayed as "01" / "02" / etc. */
  number: number;
  /** Course title, e.g. "Botulinum". */
  title: string;
  /** Format pill, e.g. "Onlinekurs" or "Online- & Praxiskurs". */
  format: string;
  /**
   * CME pill text. Either a number-with-suffix (e.g. "22 CME") or a
   * status string (e.g. "CME beantragt"). Pass null to suppress the pill.
   */
  cme?: string | null;
  /** Single-course price, formatted (e.g. "EUR 1.290"). */
  price: string;
  /** One-line "what you'll learn here" description shown on the card. */
  benefit: string;
  /** Link target for the "Zu den Kursdetails" CTA. */
  href: string;
}

export interface LernpfadDestination {
  /** Name of the certification, e.g. "Botulinum Specialist". */
  certificationName: string;
  /**
   * Short paragraph about the certification. ReactNode so callers can
   * highlight key phrases (e.g. wrap "EPHIA Botulinum Specialist
   * Zertifikat" in a styled <strong>).
   */
  certificationDescription: ReactNode;
  /**
   * Optional total CME pill shown on the certification card, e.g.
   * "60 CME-Punkte". Pass null/undefined to suppress.
   */
  cmeTotal?: string;
  /**
   * Optional small note below the CME total, e.g. caveats like
   * "(zzgl. Praxis Masterclass beantragt)".
   */
  cmeNote?: string;
}

interface LernpfadProps {
  heading: string;
  intro?: string;
  steps: LernpfadStep[];
  destination: LernpfadDestination;
}

/**
 * Curriculum Lernpfad — a playful, hand-drawn-feeling visual journey
 * through the recommended sequence of courses.
 *
 * Layout:
 *  - Desktop: courses zigzag left/right of a centered SVG path so the
 *    eye follows a real route. Numbered medallions sit on the path
 *    between cards.
 *  - Mobile: courses stack centered with a single vertical dashed line
 *    on the left margin holding the medallions.
 *
 * The SVG path strokes itself in (animates `stroke-dashoffset` from
 * full to 0) once the section enters the viewport. Falls back to the
 * fully-drawn state when JS is disabled.
 *
 * Trophy at the bottom celebrates completion of the path and surfaces
 * the curriculum-level certification (e.g. "Botulinum Specialist").
 */
export function Lernpfad({
  heading,
  intro,
  steps,
  destination,
}: LernpfadProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      // No-IO environments: skip the animation, show the path drawn.
      setDrawn(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setDrawn(true);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="lernpfad"
      className="bg-[#0066FF] py-20 md:py-28 relative overflow-hidden scroll-mt-24"
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        {/* Heading */}
        <div className="text-center mb-12 md:mb-16 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-wide uppercase mb-4 text-white">
            {heading}
          </h2>
          {intro && (
            <p className="text-base md:text-lg text-white/80 leading-relaxed">
              {intro}
            </p>
          )}
        </div>

        {/* Start anchor */}
        <div className="flex justify-center mb-2">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm">
            <Compass
              className="w-4 h-4 text-[#0066FF]"
              strokeWidth={2.5}
              aria-hidden="true"
            />
            <span className="text-xs md:text-sm font-bold tracking-wide text-black">
              START
            </span>
          </div>
        </div>

        {/* Path + cards */}
        <div className="relative">
          {/* Decorative SVG path — desktop only. The path snakes between
              alternating left/right card slots. Two control points per
              segment give the curve a hand-drawn, organic feel. */}
          <DesktopPath drawn={drawn} stepCount={steps.length} />

          {/* Mobile straight dashed line (left margin) */}
          <MobileLine drawn={drawn} />

          <ol className="relative space-y-12 md:space-y-20">
            {steps.map((step, idx) => (
              <PathStep
                key={step.number}
                step={step}
                side={idx % 2 === 0 ? "left" : "right"}
              />
            ))}
          </ol>
        </div>

        {/* Destination — trophy + certification */}
        <Destination destination={destination} />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function PathStep({
  step,
  side,
}: {
  step: LernpfadStep;
  side: "left" | "right";
}) {
  const numberLabel = String(step.number);
  // Desktop: alternate sides. Mobile: always "left" (cards span full width).
  const desktopAlign =
    side === "left"
      ? "md:justify-start md:pr-[55%]"
      : "md:justify-end md:pl-[55%]";

  return (
    <li className={`relative flex justify-center ${desktopAlign}`}>
      {/* Medallion — circle with the step number, sits on top of the
          path on desktop and on the mobile vertical line. Inverted to
          white-on-blue now the section background is blue; the ring
          matches the new background so the dashed path appears to pass
          behind the medallion. */}
      <div
        className="hidden md:flex absolute left-1/2 top-6 -translate-x-1/2 z-10 w-12 h-12 rounded-full bg-white text-[#0066FF] items-center justify-center font-bold text-base shadow-md ring-4 ring-[#0066FF]"
        aria-hidden="true"
      >
        {numberLabel}
      </div>
      {/* Mobile medallion sits on the left dashed line */}
      <div
        className="md:hidden absolute left-3 top-6 z-10 w-10 h-10 rounded-full bg-white text-[#0066FF] flex items-center justify-center font-bold text-sm shadow-md ring-4 ring-[#0066FF]"
        aria-hidden="true"
      >
        {numberLabel}
      </div>

      {/* Card */}
      <article className="relative w-full md:w-auto md:max-w-md bg-white rounded-[14px] shadow-md p-6 md:p-7 ml-14 md:ml-0">
        {/* Decorative faded number top-right */}
        <span
          aria-hidden="true"
          className="absolute top-3 right-5 text-5xl font-bold text-[#0066FF]/10 leading-none select-none"
        >
          {numberLabel}
        </span>

        {/* Title */}
        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-black mb-3 mt-1">
          {step.title}
        </h3>

        {/* Pills row: format + CME */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className="text-[11px] font-semibold tracking-wide rounded-full px-2.5 py-1 bg-[#0066FF]/10 text-[#0066FF]">
            {step.format}
          </span>
          {step.cme && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide rounded-full px-2.5 py-1 bg-rose-500 text-white">
              <Award className="w-3 h-3" aria-hidden="true" />
              {step.cme}
            </span>
          )}
        </div>

        {/* Benefit copy */}
        <p className="text-sm md:text-base text-black/75 leading-relaxed mb-6">
          {step.benefit}
        </p>

        {/* Price + CTA — sit on the same row so the call to action and
            the cost the buyer is committing to read as one unit. */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-black/[0.06]">
          <span className="text-base md:text-lg font-bold text-black tabular-nums">
            {step.price}
          </span>
          <a
            href={step.href}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0066FF] hover:text-[#0055DD] group"
          >
            Zu den Kursdetails
            <ArrowRight
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </a>
        </div>
      </article>
    </li>
  );
}

function Destination({ destination }: { destination: LernpfadDestination }) {
  return (
    <div className="mt-16 md:mt-20 flex flex-col items-center text-center">
      {/* Trophy floats above the card and overlaps it slightly so the
          card visually "earns" the trophy. -mb-10 negative margin lets
          the bottom half of the trophy sit on top of the card edge. */}
      <div className="relative z-10 -mb-10">
        <div className="w-20 h-20 rounded-full bg-rose-500 flex items-center justify-center shadow-lg ring-8 ring-[#0066FF]">
          <Trophy
            className="w-10 h-10 text-white"
            strokeWidth={2}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Single card: title + description + CME pill. No eyebrows, no
          inner divider — the trophy already says "achievement" and the
          title says what the achievement is. */}
      <div className="max-w-lg w-full bg-white rounded-[14px] shadow-md px-6 pt-14 pb-7 md:px-7 md:pt-16 md:pb-8">
        <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-black mb-3">
          {destination.certificationName}
        </h3>
        <p className="text-sm md:text-base text-black/70 leading-relaxed mb-5">
          {destination.certificationDescription}
        </p>

        {destination.cmeTotal && (
          <>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold rounded-full px-3 py-1.5 bg-rose-500 text-white">
              <Award className="w-4 h-4" aria-hidden="true" />
              {destination.cmeTotal}
            </span>
            {destination.cmeNote && (
              <p className="mt-3 text-xs md:text-sm text-black/55">
                {destination.cmeNote}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Decorative paths                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Desktop SVG path — snakes between the alternating card slots. Path
 * geometry is computed from `stepCount` so adding/removing steps just
 * adjusts the curve count automatically.
 *
 * Coordinates use a 100×N viewBox where N scales with the step count;
 * the SVG is positioned absolutely and stretched over the entire ol
 * via inset-0.
 */
function DesktopPath({
  drawn,
  stepCount,
}: {
  drawn: boolean;
  stepCount: number;
}) {
  // Vertical units per step (in viewBox space).
  const stepHeight = 100;
  const totalHeight = stepCount * stepHeight;

  // Build the snake path: start centered at top, then for each step
  // bend out to the matching card side and back to center for the
  // medallion that sits on the spine.
  const segments: string[] = [`M 50 0`];
  for (let i = 0; i < stepCount; i++) {
    const yMid = i * stepHeight + stepHeight / 2;
    const yEnd = (i + 1) * stepHeight;
    // Even index = card on left → bow path right (so the curve hugs
    // the card's right edge). Odd = mirror.
    const bowX = i % 2 === 0 ? 78 : 22;
    segments.push(
      `Q ${bowX} ${yMid} 50 ${yEnd}`,
    );
  }
  const d = segments.join(" ");

  return (
    <svg
      className="hidden md:block absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 100 ${totalHeight}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke="white"
        strokeOpacity={0.85}
        strokeWidth="0.6"
        strokeLinecap="round"
        // Long dashes (`6 4` in viewBox units) read as a hand-drawn
        // dashed route rather than a technical dotted line.
        strokeDasharray="2 1.4"
        // Animate the path drawing in. We use pathLength so the
        // dashoffset animation works regardless of the actual path
        // length (which depends on stepCount).
        pathLength={1}
        strokeDashoffset={drawn ? 0 : 1}
        style={{
          transition: "stroke-dashoffset 1100ms ease-in-out",
        }}
      />
    </svg>
  );
}

function MobileLine({ drawn }: { drawn: boolean }) {
  return (
    <div
      className="md:hidden absolute left-8 top-0 bottom-0 w-px"
      aria-hidden="true"
    >
      <div
        className="w-px h-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(255,255,255,0.85) 0 6px, transparent 6px 12px)",
          // Animate height from 0 → 100% as the path "draws" in.
          transformOrigin: "top",
          transform: drawn ? "scaleY(1)" : "scaleY(0)",
          transition: "transform 1100ms ease-in-out",
        }}
      />
    </div>
  );
}
