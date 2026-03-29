"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, Loader2, Award, ChevronDown } from "lucide-react";

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
}: CourseCardProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
            <Award className="w-4 h-4" />
            <span className="text-sm font-bold">{cmePoints}</span>
          </div>
        )}
        <h2 className="text-3xl font-bold text-black mb-4 pr-24">{title}</h2>
        <p className="text-black mb-3 mt-3 min-h-[3.5rem]">{description}</p>
      </div>

      {/* Body */}
      <div className="px-8 pt-6 pb-4">
        <div className="mb-6">
          <div className="text-4xl font-bold text-[#0066FF] mb-1">{price}</div>
          <p className="text-sm text-black">Ratenzahlungen sind möglich mit Klarna.</p>
        </div>

        {additionalInfo ? (
          <div className="mb-6 font-semibold text-black min-h-[1.5rem]">{additionalInfo}</div>
        ) : (
          <div className="mb-6 min-h-[1.5rem]" />
        )}

        {bookingType === "direct" ? (
          <div className="mb-6">
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
          <div className="space-y-4 mb-6">
            {/* Custom dropdown with colored availability badges */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full bg-white border-2 border-[#0066FF] text-[#0066FF] font-semibold py-2.5 px-4 rounded-md cursor-pointer flex items-center justify-between"
              >
                <span className={selectedDateObj ? "" : "opacity-70"}>
                  {selectedDateObj ? selectedDateObj.label : "Termine anschauen"}
                </span>
                <ChevronDown className={`w-5 h-5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[280px] overflow-y-auto">
                  {dates.map((date) => {
                    let badgeClasses = "px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap";
                    if (!date.available) {
                      badgeClasses += " bg-slate-100 text-slate-500";
                    } else if (date.availabilityLevel === "low") {
                      badgeClasses += " bg-[#FAEBE1] text-[#B5475F]";
                    } else if (date.availabilityLevel === "medium") {
                      badgeClasses += " bg-amber-100 text-amber-700";
                    } else if (date.availabilityLevel === "ok") {
                      badgeClasses += " bg-emerald-100 text-emerald-700";
                    } else {
                      badgeClasses += " bg-slate-100 text-slate-600";
                    }

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
                        <span className="truncate mr-3">{date.label}</span>
                        {date.availabilityTag && (
                          <span className={badgeClasses}>{date.availabilityTag}</span>
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

            <a
              href="https://share-eu1.hsforms.com/2FeNQT7foRlSp5S4dYfmW8A"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center text-sm text-gray-500 hover:text-[#0066FF] underline-offset-4 hover:underline font-normal transition-colors mt-0"
            >
              Schickt mir Termin-Updates
            </a>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="border-t border-gray-200 pt-6 mt-auto px-8 pb-8">
        <h3 className="font-bold text-black mb-4">Im {title.split(" ")[0]} inkludiert:</h3>
        <ul className="space-y-2">
          {features.map((feature, index) => {
            const isCME = feature.text.includes("CME");
            return (
              <li key={index} className="flex items-start gap-2">
                <Check className="w-5 h-5 text-[#0066FF] flex-shrink-0 mt-0.5" />
                <span className={`text-base ${isCME ? "text-[#0066FF] font-bold" : "text-black"}`}>
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
