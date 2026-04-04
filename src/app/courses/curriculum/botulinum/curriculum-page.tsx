"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, Loader2, Award, ChevronDown, ArrowRight } from "lucide-react";
import type { CurriculumConfig } from "@/lib/curricula";
import type { CourseTemplate, CourseSession } from "@/lib/types";

interface Props {
  curriculum: CurriculumConfig;
  templates: CourseTemplate[];
  sessions: CourseSession[];
}

// ephia.de landing page links per course
const COURSE_LANDING_PAGES: Record<string, string> = {
  grundkurs_botulinum: "https://www.ephia.de/grundkurs-botulinum",
  grundkurs_medizinische_hautpflege: "https://www.ephia.de/grundkurs-medizinische-hautpflege",
  aufbaukurs_therapeutische_indikationen_botulinum: "https://www.ephia.de/aufbaukurs-therapeutische-indikationen",
  masterclass_botulinum: "https://www.ephia.de/masterclass-botulinum",
};

function formatSessionLabel(session: CourseSession): string {
  let label = session.label_de || session.date_iso;
  if (session.start_time && session.duration_minutes) {
    const [h, m] = session.start_time.split(":").map(Number);
    const endMinutes = h * 60 + m + session.duration_minutes;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");
    label = `${label} · ${session.start_time}–${endH}:${endM}`;
  }
  return label;
}

function getAvailability(session: CourseSession) {
  const remaining = session.max_seats - session.booked_seats;
  const available = remaining > 0;

  let availabilityTag: string | null = null;
  let availabilityLevel: "low" | "medium" | "ok" | "none" = "none";

  if (!available) {
    availabilityTag = "ausgebucht";
    availabilityLevel = "none";
  } else if (remaining === 1) {
    availabilityTag = "1 Platz frei";
    availabilityLevel = "low";
  } else if (remaining === 2) {
    availabilityTag = "2 Plätze frei";
    availabilityLevel = "medium";
  } else {
    availabilityTag = "2+ Plätze frei";
    availabilityLevel = "ok";
  }

  return { available, availabilityTag, availabilityLevel };
}

function getBadgeClasses(level: string) {
  let cls = "px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap";
  if (level === "none") cls += " bg-slate-100 text-slate-500";
  else if (level === "low") cls += " bg-[#FAEBE1] text-[#B5475F]";
  else if (level === "medium") cls += " bg-amber-100 text-amber-700";
  else if (level === "ok") cls += " bg-emerald-100 text-emerald-700";
  else cls += " bg-slate-100 text-slate-600";
  return cls;
}

function formatPrice(amount: number | null) {
  if (!amount) return "";
  return `EUR ${amount.toLocaleString("de-DE")}`;
}

export function CurriculumPage({ curriculum, templates, sessions: initialSessions }: Props) {
  const [sessions, setSessions] = useState(initialSessions);
  const [selectedSessions, setSelectedSessions] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Poll for session updates
  useEffect(() => {
    const templateIds = templates.map((t) => t.id);
    const poll = async () => {
      try {
        const allSessions: CourseSession[] = [];
        for (const templateId of templateIds) {
          const res = await fetch(`/api/course-sessions?templateId=${templateId}`);
          if (res.ok) {
            const data = await res.json();
            allSessions.push(...data.sessions);
          }
        }
        setSessions(allSessions);
      } catch {
        // silently ignore
      }
    };
    const interval = setInterval(poll, 60_000);
    return () => clearInterval(interval);
  }, [templates]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown];
        if (ref && !ref.contains(e.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  // Reset loading on visibility change (after Stripe redirect back)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") setLoadingCheckout(false);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const getSessionsForTemplate = (templateId: string) =>
    sessions.filter((s) => s.template_id === templateId);

  const getCourseConfig = (courseKey: string) =>
    curriculum.courses.find((c) => c.courseKey === courseKey);

  const getCoursePrice = (template: CourseTemplate) => {
    const config = getCourseConfig(template.course_key || "");
    if (config?.courseType === "Onlinekurs") return template.price_gross_online;
    return template.price_gross_kombi;
  };

  const getCourseName = (template: CourseTemplate) => {
    const config = getCourseConfig(template.course_key || "");
    if (config?.courseType === "Onlinekurs") return template.name_online || template.title;
    return template.name_kombi || template.title;
  };

  const getCourseFeatures = (template: CourseTemplate) => {
    const config = getCourseConfig(template.course_key || "");
    if (config?.courseType === "Onlinekurs") return template.features_online;
    return template.features_kombi;
  };

  const getCourseCme = (template: CourseTemplate) => {
    const config = getCourseConfig(template.course_key || "");
    if (config?.courseType === "Onlinekurs") return template.cme_online;
    return template.cme_kombi;
  };

  const isOnlineCourse = (courseKey: string) =>
    getCourseConfig(courseKey)?.courseType === "Onlinekurs";

  // Pricing
  const totalGross = templates.reduce(
    (sum, t) => sum + (getCoursePrice(t) || 0),
    0
  );
  const discountedTotal = totalGross * (1 - curriculum.discountPercent / 100);
  const savings = totalGross - discountedTotal;

  const allSessionsSelected = templates.every((t) => {
    const courseKey = t.course_key || "";
    // Online-only courses don't need a session
    if (isOnlineCourse(courseKey)) return true;
    const courseSessions = getSessionsForTemplate(t.id);
    if (courseSessions.length === 0) return false;
    return !!selectedSessions[courseKey];
  });

  const redirectTo = (url: string) => {
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch {
      window.location.href = url;
    }
  };

  const handleCheckout = async () => {
    if (!allSessionsSelected) {
      alert("Bitte wähle für jeden Kurs einen Termin aus.");
      return;
    }

    setLoadingCheckout(true);
    const timeoutId = setTimeout(() => setLoadingCheckout(false), 15_000);

    try {
      const res = await fetch("/api/curriculum-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: curriculum.slug,
          sessions: selectedSessions,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        alert(data.error || "Fehler beim Starten des Checkouts.");
        clearTimeout(timeoutId);
        setLoadingCheckout(false);
        return;
      }

      redirectTo(data.url);
    } catch {
      alert("Unerwarteter Fehler beim Starten des Checkouts.");
      clearTimeout(timeoutId);
      setLoadingCheckout(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0066FF" }}>
      {/* Hero */}
      <div className="pt-16 pb-12 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          {curriculum.title}
        </h1>
        <p className="text-xl text-white/90 max-w-2xl mx-auto mb-2">
          {curriculum.subtitle}
        </p>
        <p className="text-white/70 max-w-xl mx-auto">
          {curriculum.description}
        </p>
      </div>

      {/* Course Timeline */}
      <div className="max-w-3xl mx-auto px-4 pb-8">
        <div className="space-y-0">
          {templates.map((template, index) => {
            const courseKey = template.course_key || "";
            const courseSessions = getSessionsForTemplate(template.id);
            const selectedId = selectedSessions[courseKey];
            const selectedSession = courseSessions.find((s) => s.id === selectedId);
            const isLast = index === templates.length - 1;
            const landingPage = COURSE_LANDING_PAGES[courseKey];

            return (
              <div key={template.id} className="relative flex gap-6">
                {/* Timeline connector */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-white text-[#0066FF] font-bold text-lg flex items-center justify-center shadow-lg z-10">
                    {index + 1}
                  </div>
                  {!isLast && (
                    <div className="w-0.5 flex-1 bg-white/30 min-h-[2rem]" />
                  )}
                </div>

                {/* Card */}
                <div className="bg-white rounded-[10px] shadow-lg flex-1 mb-6">
                  {/* Card header */}
                  <div className="rounded-t-[10px] p-5" style={{ backgroundColor: "hsl(24, 71%, 93%)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-black">
                          {getCourseName(template)}
                        </h3>
                        {isOnlineCourse(courseKey) && (
                          <span className="inline-block mt-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            Onlinekurs
                          </span>
                        )}
                        {getCourseCme(template) && (
                          <div className="inline-flex items-center gap-1 mt-2 bg-[#0066FF] text-white px-2.5 py-1 rounded-full text-sm font-bold">
                            <Award className="w-3.5 h-3.5" />
                            {getCourseCme(template)}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-[#0066FF]">
                          {formatPrice(getCoursePrice(template))}
                        </div>
                        <div className="text-xs text-gray-500">Einzelpreis</div>
                      </div>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-5">
                    {/* Features */}
                    {getCourseFeatures(template) && getCourseFeatures(template)!.length > 0 && (
                      <ul className="space-y-1.5 mb-4">
                        {getCourseFeatures(template)!.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-[#0066FF] flex-shrink-0 mt-0.5" />
                            <span className="text-black">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Session picker (only for Kombikurs) */}
                    {!isOnlineCourse(courseKey) && (
                      <div
                        ref={(el) => { dropdownRefs.current[courseKey] = el; }}
                        className="relative"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenDropdown(openDropdown === courseKey ? null : courseKey)
                          }
                          className="w-full bg-white border-2 border-[#0066FF] text-[#0066FF] font-semibold text-sm py-2.5 px-4 rounded-md cursor-pointer flex items-center justify-between gap-2"
                        >
                          <span
                            className={`flex items-center gap-2 ${selectedSession ? "" : "opacity-70"}`}
                          >
                            {selectedSession
                              ? formatSessionLabel(selectedSession)
                              : "Termin auswählen"}
                            {selectedSession && (() => {
                              const { availabilityTag, availabilityLevel } = getAvailability(selectedSession);
                              return availabilityTag ? (
                                <span className={getBadgeClasses(availabilityLevel)}>
                                  {availabilityTag}
                                </span>
                              ) : null;
                            })()}
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 flex-shrink-0 transition-transform ${
                              openDropdown === courseKey ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {openDropdown === courseKey && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[240px] overflow-y-auto">
                            {courseSessions.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-gray-400">
                                Noch keine Termine verfügbar
                              </div>
                            ) : (
                              courseSessions.map((session) => {
                                const { available, availabilityTag, availabilityLevel } =
                                  getAvailability(session);
                                return (
                                  <button
                                    key={session.id}
                                    type="button"
                                    disabled={!available}
                                    onClick={() => {
                                      setSelectedSessions((prev) => ({
                                        ...prev,
                                        [courseKey]: session.id,
                                      }));
                                      setOpenDropdown(null);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors ${
                                      !available
                                        ? "text-gray-400 cursor-not-allowed"
                                        : selectedId === session.id
                                          ? "bg-blue-50 font-semibold text-black"
                                          : "font-semibold text-black hover:bg-gray-50"
                                    }`}
                                  >
                                    <span className="mr-3">
                                      {formatSessionLabel(session)}
                                    </span>
                                    {availabilityTag && (
                                      <span className={getBadgeClasses(availabilityLevel)}>
                                        {availabilityTag}
                                      </span>
                                    )}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Online-only indicator */}
                    {isOnlineCourse(courseKey) && (
                      <div className="text-sm text-gray-500 italic">
                        Sofort verfügbar nach Kauf
                      </div>
                    )}

                    {/* Link to individual course page */}
                    {landingPage && (
                      <a
                        href={landingPage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-3 text-sm text-[#0066FF] hover:underline font-medium"
                      >
                        Mehr erfahren
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bundle CTA */}
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <div className="bg-white rounded-[10px] shadow-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-black mb-2">
              Komplettpaket {curriculum.title}
            </h2>
            <p className="text-gray-600">
              Alle {templates.length} Kurse als Kombikurs in einem Paket
            </p>
          </div>

          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center">
              <div className="text-lg text-gray-400 line-through">
                {formatPrice(totalGross)}
              </div>
              <div className="text-xs text-gray-400">Einzelpreise gesamt</div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300" />
            <div className="text-center">
              <div className="text-3xl font-bold text-[#0066FF]">
                {formatPrice(discountedTotal)}
              </div>
              <div className="text-sm font-semibold text-emerald-600">
                Du sparst {formatPrice(savings)}
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {templates.map((t) => {
              const courseKey = t.course_key || "";
              const isSelected = isOnlineCourse(courseKey) || !!selectedSessions[courseKey];
              return (
                <div
                  key={t.id}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    isSelected ? "bg-[#0066FF]" : "bg-gray-200"
                  }`}
                  title={
                    isSelected
                      ? `${t.name_kombi || t.title}: Termin ausgewählt`
                      : `${t.name_kombi || t.title}: Termin auswählen`
                  }
                />
              );
            })}
          </div>

          <button
            onClick={handleCheckout}
            disabled={!allSessionsSelected || loadingCheckout}
            className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-lg py-4 rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {loadingCheckout ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Wird geladen...
              </>
            ) : !allSessionsSelected ? (
              "Bitte wähle alle Termine aus"
            ) : (
              "Komplettpaket buchen"
            )}
          </button>

          <p className="text-center text-sm text-gray-500 mt-3">
            Ratenzahlungen sind möglich mit Klarna.
          </p>
        </div>
      </div>
    </div>
  );
}
