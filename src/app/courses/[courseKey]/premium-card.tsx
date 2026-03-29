"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, Loader2, Award, ChevronDown, Info, X } from "lucide-react";

interface CourseDate {
  id: string;
  label: string;
  available: boolean;
  availabilityTag?: string | null;
  availabilityLevel?: "low" | "medium" | "ok" | "none";
}

interface IncludedCourse {
  name: string;
  description: string;
  cmePoints: string;
  duration: string;
  features: string[];
}

interface PremiumCardProps {
  dates: CourseDate[];
  onBook: (selectedDateId: string) => void;
  isLoading: boolean;
  selectedDateForLoading?: string;
}

const INCLUDED_COURSES: IncludedCourse[] = [
  {
    name: "Grundkurs Botulinum",
    description: "Erlerne die praxisnahe Theorie zur professionellen Behandlung von Patient:innen.",
    cmePoints: "10",
    duration: "~6 Stunden",
    features: [
      "Anatomie, Techniken & Stolpersteine",
      "Glabella, Stirn, Krähenfüße",
      "Schönheitsideale & Hintergründe",
    ],
  },
  {
    name: "Aufbaukurs Botulinum: periorale Zone",
    description: "Lerne mit diesem spezialisierten Onlinekurs die Behandlung der sensiblen perioralen Zone mit präzisen Techniken zu meistern.",
    cmePoints: "10",
    duration: "~6 Stunden",
    features: [
      "Anatomie, Techniken & Stolpersteine",
      "Lip Flip, Mundwinkel, Erdbeerkinn, Gummy Smile",
      "Schönheitsideale & Hintergründe",
    ],
  },
  {
    name: "Aufbaukurs Botulinum: therapeutische Indikationen",
    description: "Erweitere Deine Kompetenz um therapeutische Anwendungen von Botulinum.",
    cmePoints: "10",
    duration: "~6 Stunden",
    features: [
      "Anatomie, Techniken & Stolpersteine",
      "Bruxismus, Migräne, Hyperhidrosis, Muskulärer Hartspann",
    ],
  },
  {
    name: "Grundkurs Medizinische Hautpflege",
    description: "In diesem Onlinekurs lernst Du, medizinische Hautpflege fundiert anzuwenden, als ideale Ergänzung zu Botulinumbehandlungen für nachhaltige ästhetische Ergebnisse.",
    cmePoints: "7",
    duration: "~4 Stunden",
    features: [
      "Grundlagen der Hautalterung",
      "Akne, Rosazea, periorale Dermatitis",
      "Aufbau einer nachhaltigen Pflegeroutine",
    ],
  },
];

function CourseInfoModal({ course, onClose }: { course: IncludedCourse; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <h3 className="text-lg font-bold text-black mb-1">{course.name}</h3>
          <p className="text-sm text-gray-500 mb-4">Onlinekurs</p>

          <p className="text-sm text-gray-700 mb-4">{course.description}</p>

          <div className="flex gap-6 mb-4">
            <div>
              <p className="text-sm font-bold text-[#0066FF]">CME-Punkte: {course.cmePoints}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Lernaufwand: {course.duration}</p>
            </div>
          </div>

          <hr className="mb-4" />

          <p className="text-sm font-bold text-black mb-3">Das lernst Du:</p>
          <ul className="space-y-2">
            {course.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#0066FF] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-black">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function PremiumCard({ dates, onBook, isLoading, selectedDateForLoading }: PremiumCardProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<IncludedCourse | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const getBadgeClasses = (date: { available: boolean; availabilityLevel?: string }) => {
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
    if (!selectedDate) {
      alert("Bitte wähle zuerst einen Termin.");
      return;
    }
    onBook(selectedDate);
  };

  return (
    <div className="bg-white rounded-lg flex flex-col h-full shadow-lg relative ring-2 ring-[#0066FF] shadow-2xl">
      {/* Header */}
      <div className="rounded-t-lg p-5 relative" style={{ backgroundColor: "hsl(24, 71%, 93%)" }}>
        <div className="absolute top-4 right-4 bg-[#0066FF] text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
          <Award className="w-4 h-4" />
          <span className="text-sm font-bold">49 CME</span>
        </div>
        <h2 className="text-3xl font-bold text-black mb-4 pr-24">Premium Starterpaket</h2>
        <p className="text-black mb-3 mt-3 min-h-[3.5rem]">
          Das Komplettpaket: 4 Onlinekurse + Praxiskurs in einem Bundle.
        </p>
      </div>

      {/* Body */}
      <div className="px-8 pt-6 pb-4">
        <div className="mb-4">
          <div className="flex items-baseline gap-3 mb-1">
            <div className="text-4xl font-bold text-[#0066FF]">EUR 1.998</div>
            <div className="text-lg text-gray-400 line-through">EUR 2.220</div>
          </div>
          <p className="text-sm text-[#0066FF] font-semibold">10% Rabatt auf alle Einzelkurse</p>
        </div>

        <div className="mb-6 font-semibold text-black min-h-[1.5rem]">Kursstandort Praxis: Berlin-Mitte</div>

        {/* Date picker + book button */}
        <div className="space-y-4 mb-6">
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full bg-white border-2 border-[#0066FF] text-[#0066FF] font-semibold text-sm py-2.5 px-4 rounded-md cursor-pointer flex items-center justify-between gap-2"
            >
              <span className={`flex items-center gap-2 whitespace-nowrap ${selectedDateObj ? "" : "opacity-70"}`}>
                {selectedDateObj ? selectedDateObj.label : "Praxiskurs-Termin wählen"}
                {selectedDateObj?.availabilityTag && (
                  <span className={getBadgeClasses(selectedDateObj)}>{selectedDateObj.availabilityTag}</span>
                )}
              </span>
              <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[280px] overflow-y-auto">
                {dates.map((date) => (
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
                      <span className={getBadgeClasses(date)}>{date.availabilityTag}</span>
                    )}
                  </button>
                ))}
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
              "Premium Starterpaket buchen"
            )}
          </button>
        </div>
      </div>

      {/* Included courses */}
      <div className="border-t border-gray-200 pt-6 mt-auto px-8 pb-8">
        <h3 className="font-bold text-black mb-4">Im Starterpaket inkludiert:</h3>
        <ul className="space-y-2">
          {INCLUDED_COURSES.map((course, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-[#0066FF] flex-shrink-0 mt-0.5" />
              <span className="text-base text-black flex-1">{course.name}</span>
              <button
                type="button"
                onClick={() => setInfoModal(course)}
                className="text-[#0066FF] hover:text-[#0055DD] flex-shrink-0 mt-0.5 transition-colors"
                aria-label={`Info zu ${course.name}`}
              >
                <Info className="w-4 h-4" />
              </button>
            </li>
          ))}
          <li className="flex items-start gap-2">
            <Check className="w-5 h-5 text-[#0066FF] flex-shrink-0 mt-0.5" />
            <span className="text-base text-[#0066FF] font-bold">Praxiskurs Botulinum (vor Ort)</span>
          </li>
        </ul>
      </div>

      {infoModal && (
        <CourseInfoModal course={infoModal} onClose={() => setInfoModal(null)} />
      )}
    </div>
  );
}
