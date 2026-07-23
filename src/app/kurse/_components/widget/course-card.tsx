"use client";

import React, { useState, useEffect } from "react";
import { Check, Loader2, Award, ChevronDown, AlertTriangle } from "lucide-react";
import { TerminUpdateModal } from "./termin-update-modal";
import { CourseDateDropdown, getBadgeClasses } from "./course-date-dropdown";
import type { CourseDate } from "@/lib/course-dates";

// How many Praxistermine are visible before the rest collapses into the
// native <details> element. Keep in sync with premium-card.tsx.
const VISIBLE_DATE_COUNT = 3;

interface CourseCardProps {
  title: string;
  description: string | React.ReactNode;
  price: string;
  features: { text: string }[];
  bookingType: "direct" | "dropdown";
  dates?: CourseDate[];
  onBook?: (selectedDateId?: string) => void;
  buttonText: string;
  additionalInfo?: string;
  highlighted?: boolean;
  isLoading?: boolean;
  selectedDateForLoading?: string;
  cmePoints?: string;
  /**
   * When true, replace the numeric CME badge with a "CME beantragt"
   * pill (amber). Used for cards whose CME accreditation is still
   * pending. Mutually exclusive with `cmePoints` — if both are set,
   * `cmePending` wins.
   */
  cmePending?: boolean;
  /**
   * Label for the accreditation unit. Defaults to "CME" (LÄK courses
   * for Humanmediziner:innen). Zahnmedizin courses are accredited by
   * the Zahnärztekammer with "Fortbildungspunkte", so pass
   * `cmeUnit="Fortbildungspunkte"` there. Drives both the numeric badge
   * ("9 Fortbildungspunkte") and the pending pill
   * ("Fortbildungspunkte beantragt").
   */
  cmeUnit?: string;
  inclusionHeading?: string;
  titleClassName?: string;
  /**
   * Optional prerequisite warning rendered as an amber banner inside
   * the card body, above the price block. Used e.g. on the Masterclass
   * Botulinum Praxiskurs to flag that the Onlinekurs Periorale Zone is
   * a hard requirement.
   */
  warning?: string;
  /**
   * Controlled expand state for the "Nächste Praxistermine" list. When
   * `onToggleDates` is provided the card is controlled by the parent so
   * every sibling card unfolds together (all dropdown cards on a landing
   * page share the same `dates`). When omitted the card falls back to its
   * own internal state.
   */
  datesExpanded?: boolean;
  onToggleDates?: () => void;
}

export function CourseCard({
  title,
  description,
  price,
  features,
  bookingType,
  dates = [],
  onBook,
  buttonText,
  additionalInfo,
  highlighted = false,
  isLoading = false,
  selectedDateForLoading,
  cmePoints,
  cmePending,
  cmeUnit = "CME",
  inclusionHeading,
  titleClassName,
  warning,
  datesExpanded,
  onToggleDates,
}: CourseCardProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [showTerminModal, setShowTerminModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Expand state for the Praxistermine list. On desktop (lg+, where the
  // cards sit side by side) the parent controls it via `onToggleDates` so
  // every card unfolds in sync. On mobile the cards stack vertically, so
  // each card keeps its own independent toggle (original behaviour) and we
  // fall back to internal state. `isDesktop` starts false so the initial
  // (collapsed) render matches server output regardless of viewport.
  const [internalDatesExpanded, setInternalDatesExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const useSharedDates = isDesktop && onToggleDates !== undefined;
  const showAllDates = useSharedDates ? !!datesExpanded : internalDatesExpanded;
  const toggleDates = useSharedDates
    ? onToggleDates
    : () => setInternalDatesExpanded((v) => !v);

  // Keep selected date in sync when sessions are refreshed (polling) and the
  // previously selected one is no longer available. Only reset if user had
  // actually selected something (don't auto-fill on initial load).
  // Also clear any "Bitte wähle zuerst einen Termin" hint once a date is picked.
  useEffect(() => {
    if (selectedDate) setErrorMessage(null);
    if (bookingType !== "dropdown" || !selectedDate) return;
    const stillValid = dates.some((d) => d.id === selectedDate && d.available);
    if (!stillValid) {
      setSelectedDate("");
    }
  }, [dates, selectedDate, bookingType]);

  const handleBook = () => {
    if (bookingType === "dropdown") {
      if (!selectedDate) {
        setErrorMessage("Bitte wähle zuerst einen Termin aus.");
        return;
      }
      setErrorMessage(null);
      onBook?.(selectedDate);
    } else {
      onBook?.();
    }
  };

  return (
    <div
      className={`bg-white rounded-lg flex flex-col h-full shadow-lg relative overflow-visible ${
        highlighted ? "ring-2 ring-[#0066FF] shadow-2xl" : ""
      }`}
    >
      {/* CME badge — sits on the top edge of the card. Pending status
          (CME beantragt) wins over a numeric value if both are set. */}
      {cmePending ? (
        <div
          className="absolute -top-4 right-5 z-10 bg-[#0066FF] text-white px-3 py-1.5 rounded-full flex items-center gap-1.5"
          style={{ boxShadow: "0 0 0 3px rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.15)" }}
        >
          <Award className="w-4 h-4" aria-hidden="true" />
          <span className="text-sm font-bold whitespace-nowrap">{cmeUnit} beantragt</span>
        </div>
      ) : cmePoints ? (
        <div className="absolute -top-4 right-5 z-10 bg-[#0066FF] text-white px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ boxShadow: "0 0 0 3px rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.15)" }}>
          <Award className="w-4 h-4" aria-hidden="true" />
          {/* Normalise the badge text: callers may pass either a bare
              number ("22") or a value already containing the unit ("22 CME",
              "10 CME-Punkte"), depending on whether the value comes from
              the DB or a code-level override. Append the unit only when the
              value doesn't already carry it. */}
          <span className="text-sm font-bold whitespace-nowrap">
            {cmePoints.includes(cmeUnit) || /CME/i.test(cmePoints) ? cmePoints : `${cmePoints} ${cmeUnit}`}
          </span>
        </div>
      ) : null}

      {/* Header */}
      <div className="rounded-t-lg p-5 relative" style={{ backgroundColor: "hsl(24, 71%, 93%)" }}>
        <h2 className={`font-bold text-black mb-4 lg:min-h-[2.5rem] ${titleClassName || "text-3xl"}`}>{title}</h2>
        <p className="text-black mb-3 mt-3 lg:min-h-[4.5rem]">{description}</p>
      </div>

      {/* Body */}
      <div className="px-7 pt-8 pb-5">
        {/* Prerequisite warning banner — sits above the price so it's
            impossible to miss before the user picks a date. Uses the
            same amber treatment as the prerequisite-confirmation modal
            so the visual story is consistent. */}
        {warning && (
          <div className="mb-6 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3">
            <AlertTriangle
              className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-sm font-semibold text-amber-900 leading-snug">
              {warning}
            </p>
          </div>
        )}

        {/* Price row — fixed height so it aligns across cards on desktop */}
        <div className="mb-8 lg:min-h-[4.5rem]">
          <div className="text-4xl font-bold text-[#0066FF] mb-1">{price}</div>
          <p className="text-sm text-black">Ratenzahlungen sind möglich mit Klarna.</p>
        </div>

        {/* Location row — placeholder on desktop for alignment, hidden on mobile if empty */}
        {additionalInfo ? (
          <div className="mb-8 lg:min-h-[1.5rem] font-semibold text-black">
            {additionalInfo}
          </div>
        ) : (
          <div
            className="hidden lg:block mb-8 lg:min-h-[1.5rem] font-semibold text-black"
            aria-hidden="true"
          >
            &nbsp;
          </div>
        )}

        {/* Action area — fixed height so buttons/dropdowns align on desktop */}
        <div className="mb-8 lg:min-h-[7.5rem]">
          {bookingType === "direct" ? (
            <div className="flex flex-col justify-end h-full">
              <button
                onClick={handleBook}
                disabled={isLoading}
                className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-semibold py-3 rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Wird geladen...
                  </>
                ) : (
                  buttonText
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Custom dropdown with colored availability badges */}
              <div>
                <CourseDateDropdown
                  dates={dates}
                  selectedId={selectedDate}
                  onSelect={setSelectedDate}
                />
                {errorMessage && (
                  <p
                    role="alert"
                    className="text-sm text-red-600 mt-2"
                  >
                    {errorMessage}
                  </p>
                )}
              </div>

              <button
                onClick={handleBook}
                disabled={!selectedDate || isLoading}
                className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-semibold py-3 rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {isLoading && selectedDate === selectedDateForLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Wird geladen...
                  </>
                ) : (
                  buttonText
                )}
              </button>
            </div>
          )}
        </div>

        {/* Termin-Updates link — shown for dropdown cards; spacer for direct cards only on desktop */}
        {bookingType === "dropdown" ? (
          <div className="lg:min-h-[1.25rem] mb-3">
            <button
              type="button"
              onClick={() => setShowTerminModal(true)}
              className="block w-full text-center text-sm text-gray-500 hover:text-[#0066FF] underline-offset-4 hover:underline font-normal transition-colors cursor-pointer"
            >
              Schickt mir Termin-Updates
            </button>
            {showTerminModal && (
              <TerminUpdateModal onClose={() => setShowTerminModal(false)} />
            )}
          </div>
        ) : (
          <div
            className="hidden lg:block lg:min-h-[1.25rem] mb-3"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Features — no mt-auto so the separator line + "inkludiert:" header
          sit at the same Y on every card, regardless of feature-list length.
          Cards with shorter lists simply have empty space at the bottom. */}
      <div className="border-t border-gray-200 pt-8 px-7 pb-10">
        <h3 className="font-bold text-black mb-5">{inclusionHeading || `Im ${title.split(" ")[0]} inkludiert:`}</h3>
        <ul className="space-y-3">
          {features.map((feature, index) => {
            const isInkludiert = feature.text.startsWith("Vollständiger");
            return (
              <li key={index} className="flex items-start gap-2">
                <Check className="w-5 h-5 text-[#0066FF] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className={`text-base ${isInkludiert ? "text-[#0066FF] font-bold" : "text-black"}`}>
                  {feature.text}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Nächste Praxistermine — server-rendered plain-text mirror of the
          date dropdown above. The dropdown only injects its options into
          the DOM on click, so crawlers that don't interact (Googlebot,
          AI-overview / LLM crawlers) never see the dates there. This list
          renders them as crawlable text at load time, kept in sync with
          the dropdown via the same `dates` prop. Placed below the
          features so it never disturbs the cross-card row alignment.
          Only the first few dates are visible; the rest sit in a native
          <details> element so they stay in the initial HTML (fully
          indexed under mobile-first indexing, no cloaking) without the
          card growing a nine-row list. */}
      {bookingType === "dropdown" && dates.length > 0 && (
        <div className="border-t border-gray-200 pt-8 px-7 pb-10">
          <h3 className="font-bold text-black mb-5">Nächste Praxistermine:</h3>
          <ul className="space-y-3">
            {dates.slice(0, VISIBLE_DATE_COUNT).map((date) => (
              <li
                key={date.id}
                className="flex items-center justify-between gap-3 text-base"
              >
                <span className={date.available ? "text-black" : "text-gray-400"}>
                  {date.label}
                </span>
                {date.availabilityTag && (
                  <span className={getBadgeClasses(date)}>{date.availabilityTag}</span>
                )}
              </li>
            ))}
          </ul>
          {dates.length > VISIBLE_DATE_COUNT && (
            <div className="mt-3">
              {/* Controlled toggle instead of a native <details> so all
                  dropdown cards on the page unfold together. The extra
                  dates stay rendered in the DOM (hidden via CSS when
                  collapsed) so crawlers still index them, matching the
                  old <details> behaviour. */}
              <button
                type="button"
                onClick={toggleDates}
                aria-expanded={showAllDates}
                aria-controls={`${title}-praxistermine-rest`}
                className="flex items-center gap-1 text-sm font-semibold text-[#0066FF] cursor-pointer hover:underline underline-offset-4"
              >
                <span>
                  {showAllDates
                    ? "Weniger Termine anzeigen"
                    : `Alle ${dates.length} Termine anzeigen`}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showAllDates ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              <ul
                id={`${title}-praxistermine-rest`}
                className={`space-y-3 mt-3 ${showAllDates ? "" : "hidden"}`}
              >
                {dates.slice(VISIBLE_DATE_COUNT).map((date) => (
                  <li
                    key={date.id}
                    className="flex items-center justify-between gap-3 text-base"
                  >
                    <span className={date.available ? "text-black" : "text-gray-400"}>
                      {date.label}
                    </span>
                    {date.availabilityTag && (
                      <span className={getBadgeClasses(date)}>{date.availabilityTag}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
