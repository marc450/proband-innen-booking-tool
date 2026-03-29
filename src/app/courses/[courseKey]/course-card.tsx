"use client";

import React, { useState } from "react";
import { Check, Loader2, Award } from "lucide-react";

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
              className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-semibold py-4 rounded-md disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
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
            {/* Native select for reliability in iframes */}
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-white border-2 border-[#0066FF] text-[#0066FF] font-semibold py-3.5 px-4 rounded-md appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%230066FF' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 0.75rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "1.25em 1.25em",
              }}
            >
              <option value="" disabled>Termine anschauen</option>
              {dates.map((date) => (
                <option key={date.id} value={date.id} disabled={!date.available}>
                  {date.label}{date.availabilityTag ? ` — ${date.availabilityTag}` : ""}
                </option>
              ))}
            </select>

            <button
              onClick={handleBook}
              disabled={!selectedDate || isLoading}
              className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-semibold py-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
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
