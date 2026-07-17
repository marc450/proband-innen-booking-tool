"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CourseDate } from "@/lib/course-dates";

// The Praxiskurs-Termin picker used by the public booking widget
// (CourseCard) and by the "Praxiskurs dazubuchen" offer on /mein-konto.
//
// A native <select> can't render the coloured availability badges next to
// each date, which is why this is a button + panel instead.

// Exported because the crawlable "Nächste Praxistermine" list on the
// course card renders the same badges outside the dropdown.
export function getBadgeClasses(date: Pick<CourseDate, "available" | "availabilityLevel">) {
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
}

interface Props {
  dates: CourseDate[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  // The offer card on /mein-konto is a third the width of a marketing
  // card, so the panel can't claim a 340px minimum there.
  panelMinWidthClass?: string;
}

export function CourseDateDropdown({
  dates,
  selectedId,
  onSelect,
  placeholder = "Praxiskurs-Termin wählen",
  panelMinWidthClass = "min-w-[340px]",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = dates.find((d) => d.id === selectedId);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full bg-white border-2 border-[#0066FF] text-[#0066FF] font-semibold text-sm py-3 px-4 rounded-md cursor-pointer flex items-center justify-between gap-2"
      >
        <span
          className={`flex items-center gap-2 whitespace-nowrap ${selected ? "" : "opacity-70"}`}
        >
          {selected ? selected.label : placeholder}
          {selected?.availabilityTag && (
            <span className={getBadgeClasses(selected)}>{selected.availabilityTag}</span>
          )}
        </span>
        <ChevronDown
          className={`w-5 h-5 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute z-50 w-full ${panelMinWidthClass} right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[280px] overflow-y-auto`}
        >
          {dates.map((date) => (
            <button
              key={date.id}
              type="button"
              role="option"
              aria-selected={selectedId === date.id}
              disabled={!date.available}
              onClick={() => {
                onSelect(date.id);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-start lg:justify-between gap-2 px-4 py-2 text-sm text-left transition-colors ${
                !date.available
                  ? "text-gray-400 cursor-not-allowed"
                  : selectedId === date.id
                    ? "bg-blue-50 font-semibold text-black cursor-pointer"
                    : "font-semibold text-black hover:bg-gray-50 cursor-pointer"
              }`}
            >
              <span>{date.label}</span>
              {date.availabilityTag && (
                <span className={getBadgeClasses(date)}>{date.availabilityTag}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
