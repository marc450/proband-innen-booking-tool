"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, Loader2, Award, ChevronDown } from "lucide-react";
import { TerminUpdateModal } from "./termin-update-modal";

interface CourseDate {
  id: string;
  label: string;
  available: boolean;
  availabilityTag?: string | null;
  availabilityLevel?: "low" | "medium" | "ok" | "none";
}

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
  inclusionHeading?: string;
  titleClassName?: string;
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
  inclusionHeading,
  titleClassName,
}: CourseCardProps) {
  const firstAvailableId = dates.find((d) => d.available)?.id ?? "";
  const [selectedDate, setSelectedDate] = useState(firstAvailableId);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showTerminModal, setShowTerminModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Keep selected date in sync when sessions are refreshed (polling) and the
  // previously selected one is no longer available.
  useEffect(() => {
    if (bookingType !== "dropdown") return;
    const stillValid = dates.some((d) => d.id === selectedDate && d.available);
    if (!stillValid) {
      setSelectedDate(dates.find((d) => d.available)?.id ?? "");
    }
  }, [dates, selectedDate, bookingType]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedDateObj = dates.find((d) => d.id === selectedDate);

  const getBadgeClasses = (date: CourseDate) => {
    let cls = "px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap";
    if (!date.available) {
      cls += " bg-slate-100 text-slate-500";
    } else if (date.availabilityLevel === "low") {
      cls += " bg-[#FAEBE1] text-[#B5475F]";
    } else if (date.availabilityLevel === "medium") {
      cls += " bg-amber-100 text-amber-700";
    } else if (date.availabilityLevel === "ok") {
      cls += " bg-emerald-100 text-emerald-700";
    } else {
      cls += " bg-slate-100 text-slate-600";
    }
    return cls;
  };

  const handleBook = () => {
    if (bookingType === "dropdown") {
      if (!selectedDate) {
        alert("Bitte wähle zuerst einen Termin aus.");
        return;
      }
      onBook?.(selectedDate);
    } else {
      onBook?.();
    }
  };

  return (
    <div
      className={`bg-white rounded-lg flex flex-col h-full shadow-lg relative ${
        highlighted ? "ring-2 ring-[#0066FF] shadow-2xl" : ""
      }`}
    >
      {/* Header */}
      <div className="rounded-t-lg p-5 relative" style={{ backgroundColor: "hsl(24, 71%, 93%)" }}>
        {cmePoints && (
          <div className="absolute top-4 right-4 bg-[#0066FF] text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
            <Award className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm font-bold">{cmePoints}</span>
          </div>
        )}
        <h2 className={`font-bold text-black mb-4 pr-24 ${titleClassName || "text-3xl"}`}>{title}</h2>
        <p className="text-black mb-3 mt-3 lg:min-h-[3.5rem]">{description}</p>
      </div>

      {/* Body */}
      <div className="px-5 pt-6 pb-4">
        {/* Price row — fixed height so it aligns across cards on desktop */}
        <div className="mb-6 lg:min-h-[4.5rem]">
          <div className="text-4xl font-bold text-[#0066FF] mb-1">{price}</div>
          <p className="text-sm text-black">Ratenzahlungen sind möglich mit Klarna.</p>
        </div>

        {/* Location row — placeholder on desktop for alignment, hidden on mobile if empty */}
        {additionalInfo ? (
          <div className="mb-6 lg:min-h-[1.5rem] font-semibold text-black">
            {additionalInfo}
          </div>
        ) : (
          <div
            className="hidden lg:block mb-6 lg:min-h-[1.5rem] font-semibold text-black"
            aria-hidden="true"
          >
            &nbsp;
          </div>
        )}

        {/* Action area — fixed height so buttons/dropdowns align on desktop */}
        <div className="mb-6 lg:min-h-[7.5rem]">
          {bookingType === "direct" ? (
            <div className="flex flex-col justify-end h-full">
              <button
                onClick={handleBook}
                disabled={isLoading}
                className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-semibold py-3 rounded-md disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
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
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full bg-white border-2 border-[#0066FF] text-[#0066FF] font-semibold text-sm py-3 px-4 rounded-md cursor-pointer flex items-center justify-between gap-2"
                >
                  <span className={`flex items-center gap-2 whitespace-nowrap ${selectedDateObj ? "" : "opacity-70"}`}>
                    {selectedDateObj ? selectedDateObj.label : "Termine anschauen"}
                    {selectedDateObj?.availabilityTag && (
                      <span className={getBadgeClasses(selectedDateObj)}>{selectedDateObj.availabilityTag}</span>
                    )}
                  </span>
                  <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>

                {dropdownOpen && (
                  <div className="absolute z-50 w-full min-w-[340px] right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[280px] overflow-y-auto">
                    {dates.map((date) => {
                      return (
                        <button
                          key={date.id}
                          type="button"
                          disabled={!date.available}
                          onClick={() => {
                            setSelectedDate(date.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors ${
                            !date.available
                              ? "text-gray-400 cursor-not-allowed"
                              : selectedDate === date.id
                                ? "bg-blue-50 font-semibold text-black"
                                : "font-semibold text-black hover:bg-gray-50"
                          }`}
                        >
                          <span className="mr-3">{date.label}</span>
                          {date.availabilityTag && (
                            <span className={getBadgeClasses(date)}>{date.availabilityTag}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={handleBook}
                disabled={!selectedDate || isLoading}
                className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-semibold py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
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
          <div className="lg:min-h-[1.25rem] mb-2">
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
            className="hidden lg:block lg:min-h-[1.25rem] mb-2"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Features */}
      <div className="border-t border-gray-200 pt-6 mt-auto px-5 pb-8 lg:min-h-[20rem]">
        <h3 className="font-bold text-black mb-4">{inclusionHeading || `Im ${title.split(" ")[0]} inkludiert:`}</h3>
        <ul className="space-y-2">
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
    </div>
  );
}
