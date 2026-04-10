"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { Check, Loader2, Award, ChevronDown, X } from "lucide-react";
import { TerminUpdateModal } from "./termin-update-modal";

interface CourseDate {
  id: string;
  label: string;
  available: boolean;
  availabilityTag?: string | null;
  availabilityLevel?: "low" | "medium" | "ok" | "none";
}

interface IncludedCourse {
  name: string;
  shortName?: string;
  type: "Kombikurs" | "Onlinekurs";
  level?: string;
  description: string;
  cmePoints: string;
  duration: string;
  features: string[];
  lernziele?: string[];
  kursinhalt?: string[];
  inkludiert?: string[];
  badgeClasses: string;
}

// Color coding per course — matched bg + text + hover
const PERIORAL_BADGE = "bg-purple-100 text-purple-700 hover:bg-purple-200";
const THERAPEUTISCH_BADGE = "bg-emerald-100 text-emerald-700 hover:bg-emerald-200";
const HAUTPFLEGE_BADGE = "bg-rose-100 text-rose-700 hover:bg-rose-200";

interface PremiumCardProps {
  dates: CourseDate[];
  onBook: (selectedDateId: string) => void;
  isLoading: boolean;
  selectedDateForLoading?: string;
}

const INCLUDED_COURSES: IncludedCourse[] = [
  {
    name: "Aufbaukurs Botulinum: Periorale Zone",
    shortName: "Onlinekurs Periorale Zone",
    type: "Onlinekurs",
    level: "Fortgeschrittenenkurs",
    description: "Erweitere Dein Wissen in der Ästhetik des Mundbereichs mit dem EPHIA Onlinekurs zur Behandlung der perioralen Zone mit Botulinum. Du lernst die sichere, evidenzbasierte Behandlung mit präzisen Techniken, inklusive Anatomie, Indikationen, Patient:innenkommunikation und Komplikationsmanagement.",
    cmePoints: "10",
    duration: "~6 Stunden",
    features: [
      "Anatomie, Techniken & Stolpersteine",
      "Lip Flip, Mundwinkel, Erdbeerkinn, Gummy Smile",
      "Schönheitsideale & Hintergründe",
    ],
    lernziele: [
      "Anatomie der perioralen Muskulatur",
      "Indikationen für die periorale Behandlung",
      "Produktvertrieb in der ästhetischen Praxis",
      "Patient:innenkommunikation",
      "Technik der perioralen Behandlung",
      "Komplikationsmanagement",
    ],
    kursinhalt: [
      "Begrüßung & Kursübersicht",
      "Grundlagen",
      "Schönheitsideale & Hintergründe",
      "Anatomie in der Perioralen Zone",
      "Behandlung der Lippe mit Lip Flip",
      "Behandlung der Mundwinkel",
      "Behandlung des Erdbeerkinns",
      "Behandlung des Gummy Smile",
      "Behandlung der Platysmas",
      "Myth Buster & Stolpersteine & Fragen",
    ],
    inkludiert: [
      "10 online Lernkapitel",
      "Lehrvideos",
      "Ärzt:innen-Community",
      "CME-Punkte",
      "1.5 Jahre Zugriff",
      "Zertifikat",
    ],
    badgeClasses: PERIORAL_BADGE,
  },
  {
    name: "Aufbaukurs Botulinum: Therapeutische Indikationen",
    shortName: "Onlinekurs Therapeutische Indikationen",
    type: "Onlinekurs",
    level: "Fortgeschrittenenkurs",
    description: "Erweitere Deine Kompetenz um therapeutische Anwendungen von Botulinum. Dieser Aufbaukurs richtet sich an approbierte Ärzt:innen, die bereits eine Fortbildung in der therapeutischen Anwendung von Botulinum absolviert haben. Du lernst die sichere, evidenzbasierte Behandlung von Bruxismus, Migräne, Hyperhidrosis und muskulärem Hartspann.",
    cmePoints: "10",
    duration: "~6 Stunden",
    features: [
      "Anatomie, Techniken & Stolpersteine",
      "Bruxismus, Migräne, Hyperhidrosis, Muskulärer Hartspann",
    ],
    lernziele: [
      "Anatomie der therapeutischen Zielregionen",
      "Indikationen für therapeutische Behandlungen",
      "Produktvertrieb in der ästhetischen Praxis",
      "Patient:innenkommunikation",
      "Technik der therapeutischen Behandlung",
      "Komplikationsmanagement",
    ],
    kursinhalt: [
      "Hauptkurs",
      "Botulinum in der therapeutischen Anwendung",
      "Bruxismus",
      "Migräne",
      "Hyperhidrosis",
      "Muskulärer Hartspann",
      "Myth Buster",
    ],
    inkludiert: [
      "7 online Lernkapitel",
      "Behandlungsprotokolle",
      "Ärzt:innen-Community",
      "CME-Punkte",
      "1.5 Jahre Zugriff",
      "Zertifikat",
    ],
    badgeClasses: THERAPEUTISCH_BADGE,
  },
  {
    name: "Grundkurs Medizinische Hautpflege",
    shortName: "Onlinekurs Medizinische Hautpflege",
    type: "Onlinekurs",
    level: "Für alle Fachrichtungen",
    description: "In diesem Onlinekurs lernst Du als medizinische Fachperson die Grundkenntnisse in der Hautpflege, die in 19 Minuten in der Dermatologie und medizinischen Hautpflege vermittelt werden. Der Kurs bigt praxisrelevante Strategien in evidenzbasierter Weise, mit Fokus auf patientenorientierte Beratung.",
    cmePoints: "7",
    duration: "~4 Stunden",
    features: [
      "Grundlagen der Hautalterung",
      "Akne, Rosazea, periorale Dermatitis",
      "Aufbau einer nachhaltigen Pflegeroutine",
    ],
    lernziele: [
      "Hautphysiologie",
      "Skin of Color",
      "Störungen (Akne, Rosazea, etc.)",
      "Wirkstoffe",
      "Behandlungsoptionen",
      "Patient:innenkonsultation",
    ],
    kursinhalt: [
      "Begrüßung",
      "Grundlagen zur Haut",
      "Skin of Color",
      "Akne",
      "Rosazea",
      "Periorale Dermatitis",
      "Hautalterung",
      "Aufbau einer Pflegeroutine",
      "Myth Buster",
    ],
    inkludiert: [
      "9 online Lernkapitel",
      "Lehrvideos",
      "Ärzt:innen-Community",
      "CME-Punkte",
      "1.5 Jahre Zugriff",
      "Zertifikat",
    ],
    badgeClasses: HAUTPFLEGE_BADGE,
  },
];

function CourseInfoModal({ course, onClose }: { course: IncludedCourse; onClose: () => void }) {
  const [mounted, setMounted] = React.useState(false);
  const [scrollTop, setScrollTop] = React.useState(0);
  const isIframe = typeof window !== "undefined" && window.parent !== window;

  React.useEffect(() => {
    setMounted(true);
    // Capture scroll position at open time
    setScrollTop(window.scrollY || document.documentElement.scrollTop);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // In an iframe, use absolute positioning anchored to current scroll position
  // so the modal appears in the user's visible viewport, not the iframe's top
  const overlayStyle: React.CSSProperties = isIframe
    ? { position: "absolute", top: scrollTop, left: 0, right: 0, height: window.innerHeight, backgroundColor: "rgba(0,0,0,0.5)" }
    : { backgroundColor: "rgba(0,0,0,0.5)" };
  const overlayClass = isIframe
    ? "z-[9999] flex items-center justify-center p-4"
    : "fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto";

  const modal = (
    <div
      className={overlayClass}
      style={overlayStyle}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl relative my-auto max-h-[80vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-0">
          <h3 className="text-xl font-bold text-black mb-1 pr-8">{course.name}</h3>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-gray-500">{course.type}</span>
            {course.level && (
              <span className="text-xs font-medium text-[#0066FF] bg-blue-50 rounded-full px-2.5 py-0.5">{course.level}</span>
            )}
          </div>

          <p className="text-sm text-gray-700 mb-4 leading-relaxed">{course.description}</p>

          <div className="flex flex-wrap gap-4 mb-5">
            <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
              <Award className="w-4 h-4 text-[#0066FF]" />
              <span className="text-sm font-bold text-[#0066FF]">{course.cmePoints} CME-Punkte</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-600">Lernaufwand: {course.duration}</span>
            </div>
          </div>
        </div>

        {/* Lernziele */}
        {course.lernziele && course.lernziele.length > 0 && (
          <div className="px-6 pb-5">
            <h4 className="text-sm font-bold text-black mb-3">Lernziele</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {course.lernziele.map((ziel, i) => (
                <div key={i} className="flex items-start gap-2 min-w-0">
                  <Check className="w-4 h-4 text-[#0066FF] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-black break-words min-w-0">{ziel}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kursinhalt */}
        {course.kursinhalt && course.kursinhalt.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-5">
            <h4 className="text-sm font-bold text-black mb-3">Kursinhalt</h4>
            <ol className="space-y-1.5">
              {course.kursinhalt.map((kapitel, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-gray-400 font-medium w-5 flex-shrink-0 text-right">{i + 1}.</span>
                  {kapitel}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Im Kurs inkludiert */}
        {course.inkludiert && course.inkludiert.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-5">
            <h4 className="text-sm font-bold text-black mb-3">Im Kurs inkludiert</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {course.inkludiert.map((item, i) => (
                <div key={i} className="flex items-start gap-2 min-w-0">
                  <Check className="w-4 h-4 text-[#0066FF] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-black break-words min-w-0">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback: simple features list (for courses without detailed data) */}
        {!course.lernziele && !course.kursinhalt && (
          <div className="border-t border-gray-100 px-6 py-5">
            <h4 className="text-sm font-bold text-black mb-3">Das lernst Du:</h4>
            <ul className="space-y-2">
              {course.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#0066FF] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-black">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  if (!mounted) return null;
  return ReactDOM.createPortal(modal, document.body);
}

export function PremiumCard({ dates, onBook, isLoading, selectedDateForLoading }: PremiumCardProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<IncludedCourse | null>(null);
  const [showTerminModal, setShowTerminModal] = useState(false);
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
        <h2 className="text-3xl font-bold text-black mb-4 pr-24">Komplettpaket</h2>
        <p className="text-black mb-3 mt-3 lg:min-h-[3.5rem]">
          Das Paket für Deinen selbstbewussten Start in die Ästhetik: 1 Praxiskurs + 4 begleitende Onlinekurse.
        </p>
      </div>

      {/* Body */}
      <div className="px-5 pt-6 pb-4">
        {/* Price row — fixed height to align with other cards on desktop */}
        <div className="mb-6 lg:min-h-[4.5rem]">
          <div className="flex items-baseline gap-3 mb-1">
            <div className="text-4xl font-bold text-[#0066FF]">EUR 1.998</div>
            <div className="text-lg text-gray-400 line-through">EUR 2.220</div>
          </div>
          <p className="text-sm text-[#0066FF] font-semibold">10% Rabatt auf alle Einzelkurse</p>
        </div>

        {/* Location row */}
        <div className="mb-6 lg:min-h-[1.5rem] font-semibold text-black">Praxiskurs-Standort: Berlin-Mitte</div>

        {/* Action area — fixed height to align with other cards on desktop */}
        <div className="mb-6 lg:min-h-[7.5rem]">
          <div className="space-y-4">
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full bg-white border-2 border-[#0066FF] text-[#0066FF] font-semibold text-sm py-3 px-4 rounded-md cursor-pointer flex items-center justify-between gap-2"
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
                <div className="absolute z-50 w-full min-w-[340px] right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[280px] overflow-y-auto">
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
                      <span className="mr-3">{date.label}</span>
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
                "Komplettpaket buchen"
              )}
            </button>
          </div>
        </div>

        {/* Termin-Updates link */}
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
      </div>

      {/* Included courses */}
      <div className="border-t border-gray-200 pt-6 mt-auto px-5 pb-8">
        <h3 className="font-bold text-black mb-4">Im Komplettpaket inkludiert:</h3>
        <ul className="space-y-3">
          <li className="flex items-center gap-2">
            <Check className="w-5 h-5 text-[#0066FF] flex-shrink-0" />
            <span className="text-base text-[#0066FF] font-bold">Akkreditiert mit 49 CME-Punkten</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-5 h-5 text-[#0066FF] flex-shrink-0" />
            <span className="text-base text-black italic">Vollständiger Kombikurs</span>
          </li>
          {INCLUDED_COURSES.map((course, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-[#0066FF] flex-shrink-0 mt-0.5" />
              <button
                type="button"
                onClick={() => setInfoModal(course)}
                className={`inline-flex items-center text-sm font-semibold rounded-full px-3 py-1 transition-colors cursor-pointer ${course.badgeClasses}`}
              >
                {course.shortName || course.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {infoModal && (
        <CourseInfoModal course={infoModal} onClose={() => setInfoModal(null)} />
      )}
    </div>
  );
}
