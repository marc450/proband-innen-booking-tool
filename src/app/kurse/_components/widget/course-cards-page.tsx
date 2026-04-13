"use client";

import React, { useState, useEffect } from "react";
import { CourseCard } from "./course-card";
import { PremiumCard } from "./premium-card";
import type { CourseTemplate, CourseSession, CourseType } from "@/lib/types";

interface Props {
  template: CourseTemplate;
  sessions: CourseSession[];
}

// Convert DB feature arrays to component format, with fallbacks
function toFeatures(dbFeatures: string[] | null, fallback: { text: string }[]): { text: string }[] {
  if (dbFeatures && dbFeatures.length > 0) {
    return dbFeatures.map((text) => ({ text }));
  }
  return fallback;
}

// Fallback features (used when DB has no features set)
const defaultOnlinekursFeatures = [
  { text: "Akkreditiert mit 10 CME-Punkten" },
  { text: "13 Lernkapitel" },
  { text: "2+ Stunden Behandlungsvideos" },
  { text: "Vorlagen für Rechnungen" },
  { text: "Vorlagen für Patient:innen-Infos" },
  { text: "1.5 Jahre Zugriff (inkl. Updates)" },
  { text: "Ärzt:innen-Community" },
];

const defaultPraxiskursFeatures = [
  { text: "Akkreditiert mit 12 CME-Punkten" },
  { text: "6+ Stunden gemeinsames Behandeln" },
  { text: "Üben an echten Proband:innen" },
  { text: "Erfahrene Dozent:innen-Aufsicht" },
  { text: "Max. 7 Teilnehmer:innen" },
];

const defaultKombikursFeatures = [
  { text: "Akkreditiert mit 22 CME-Punkten" },
  { text: "Vollständiger Onlinekurs inkludiert" },
  { text: "Vollständiger Praxiskurs inkludiert" },
];

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

export function CourseCardsPage({ template, sessions: initialSessions }: Props) {
  const [sessions, setSessions] = useState(initialSessions);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);

  // Poll for session updates every 60 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/course-sessions?templateId=${template.id}`);
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions);
        }
      } catch {
        // silently ignore polling errors
      }
    };

    const interval = setInterval(poll, 60_000);
    return () => clearInterval(interval);
  }, [template.id]);

  // Reset loading when user returns to page (after Stripe redirect)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setLoadingCheckout(null);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const dynamicDates = sessions.map((session) => {
    const { available, availabilityTag, availabilityLevel } = getAvailability(session);
    return {
      id: session.id,
      label: formatSessionLabel(session),
      available,
      availabilityTag,
      availabilityLevel,
    };
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

  const handleBooking = async (courseType: CourseType, sessionId?: string) => {
    const loadingKey = `${courseType}-${sessionId || "direct"}`;
    setLoadingCheckout(loadingKey);

    const timeoutId = setTimeout(() => setLoadingCheckout(null), 10_000);

    try {
      if (courseType !== "Onlinekurs" && !sessionId) {
        alert("Bitte wähle zuerst einen Termin.");
        clearTimeout(timeoutId);
        setLoadingCheckout(null);
        return;
      }

      const res = await fetch("/api/course-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseKey: template.course_key,
          courseType,
          sessionId: sessionId ?? null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        alert(data.error || "Fehler beim Starten des Checkouts.");
        clearTimeout(timeoutId);
        setLoadingCheckout(null);
        return;
      }

      redirectTo(data.url);
    } catch {
      alert("Unerwarteter Fehler beim Starten des Checkouts.");
      clearTimeout(timeoutId);
      setLoadingCheckout(null);
    }
  };

  const formatPrice = (amount: number | null) => {
    if (!amount) return "";
    return `EUR ${amount.toLocaleString("de-DE")}`;
  };

  // Course-specific overrides for header and card descriptions
  const COURSE_OVERRIDES: Record<string, { header?: string; onlineDesc?: string | React.ReactNode; praxisDesc?: string | React.ReactNode }> = {
    grundkurs_botulinum_zahnmedizin: {
      header: "UNSERE KURSANGEBOTE FÜR ZAHNÄRZT:INNEN",
      onlineDesc: "Erlerne die Theorie zur Behandlung von Patient:innen mit Botulinum.",
    },
  };

  const overrides = COURSE_OVERRIDES[template.course_key || ""] || {};
  const pageHeader = overrides.header || "UNSERE KURSANGEBOTE";
  const onlineDescription = overrides.onlineDesc || "Erlerne die praxisnahe Theorie zur professionellen Behandlung von Patient:innen.";

  return (
    <section id="kursangebote" className="py-16 md:py-24 px-4 scroll-mt-24 md:scroll-mt-28" style={{ backgroundColor: "#0066FF" }}>
      <div className="max-w-7xl mx-auto">
        <h2
          className="text-3xl md:text-4xl font-bold text-center mb-14 tracking-wide"
          style={{ color: "#fff" }}
        >
          {pageHeader}
        </h2>

        {(() => {
          const isPremiumLayout = template.course_key === "grundkurs_botulinum";
          const hasOnline = !!template.price_gross_online;
          const hasPraxis = !!template.price_gross_praxis;
          const hasKombi = !!template.price_gross_kombi;

          // Resolve features from DB, falling back to defaults
          const onlineFeatures = toFeatures(template.features_online, defaultOnlinekursFeatures);
          const praxisFeatures = toFeatures(template.features_praxis, defaultPraxiskursFeatures);
          const kombiFeatures = toFeatures(template.features_kombi, defaultKombikursFeatures);

          if (isPremiumLayout) {
            // grundkurs_botulinum only: hardcoded override so the Praxiskurs card
            // shows "Vollständiger Onlinekurs inkludiert" / "Vollständiger Praxiskurs inkludiert"
            // regardless of what's stored in course_templates.features_kombi.
            const premiumKombiFeatures = kombiFeatures
              .map((f) => {
                if (f.text === "Vollständiger Onlinekurs" || f.text === "Vollständiger Onlinekurs inkludiert") {
                  return { text: "Vollständiger Onlinekurs inkludiert" };
                }
                if (f.text === "Vollständiger Praxiskurs" || f.text === "Vollständiger Praxiskurs inkludiert") {
                  return { text: "Vollständiger Praxiskurs inkludiert" };
                }
                return f;
              })
              .filter((f) => f.text !== "EPHIA-Zertifikat nach Abschluss");

            const renderCards = (spacious: boolean) => (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {hasOnline && (
                  <CourseCard
                    title="Onlinekurs"
                    description={onlineDescription}
                    price={formatPrice(template.price_gross_online)}
                    features={onlineFeatures}
                    bookingType="direct"
                    buttonText="Onlinekurs buchen"
                    onBook={() => handleBooking("Onlinekurs")}
                    isLoading={loadingCheckout === "Onlinekurs-direct"}
                    cmePoints={template.cme_online || undefined}
                    titleClassName="text-[1.75rem]"
                    spacious={spacious}
                  />
                )}

                {hasKombi && (
                  <CourseCard
                    title="Online- & Praxiskurs"
                    description="Lerne die theoretischen Grundlagen online und die Praxis vor Ort an Proband:innen."
                    price={formatPrice(template.price_gross_kombi)}
                    features={premiumKombiFeatures}
                    bookingType="dropdown"
                    dates={dynamicDates}
                    buttonText="Online- & Praxiskurs buchen"
                    additionalInfo="Praxiskurs-Standort: Berlin-Mitte"
                    onBook={(sessionId) => handleBooking("Kombikurs", sessionId)}
                    isLoading={loadingCheckout?.startsWith("Kombikurs-") || false}
                    selectedDateForLoading={loadingCheckout?.replace("Kombikurs-", "")}
                    cmePoints={template.cme_kombi || undefined}
                    inclusionHeading="Im Online- & Praxiskurs inkludiert:"
                    titleClassName="text-[1.75rem] whitespace-nowrap"
                    spacious={spacious}
                  />
                )}

                <PremiumCard
                  dates={dynamicDates}
                  onBook={(sessionId) => handleBooking("Premium", sessionId)}
                  isLoading={loadingCheckout?.startsWith("Premium-") || false}
                  selectedDateForLoading={loadingCheckout?.replace("Premium-", "")}
                  spacious={spacious}
                />
              </div>
            );

            // Grundkurs Botulinum: Onlinekurs, Kombikurs, Premium Starterpaket
            // Two versions for comparison — V1 (compact) and V2 (spacious)
            return (
              <>
                <p className="text-center text-white/60 text-sm font-semibold uppercase tracking-widest mb-6">V1 (aktuell)</p>
                {renderCards(false)}
                <div className="mt-20 pt-16 border-t border-white/20">
                  <p className="text-center text-white/60 text-sm font-semibold uppercase tracking-widest mb-6">V2 (mehr Luft)</p>
                  {renderCards(true)}
                </div>
              </>
            );
          }

          // Default layout for all other courses
          const cardCount = [hasOnline, hasPraxis, hasKombi].filter(Boolean).length;
          const gridCols = cardCount === 1 ? "lg:grid-cols-1 max-w-lg mx-auto" : cardCount === 2 ? "lg:grid-cols-2 max-w-4xl mx-auto" : "lg:grid-cols-3";

          return (
            <div className={`grid grid-cols-1 ${gridCols} gap-8`}>
              {hasOnline && (
                <CourseCard
                  title="Onlinekurs"
                  description="Erlerne die praxisnahe Theorie zur professionellen Behandlung von Patient:innen."
                  price={formatPrice(template.price_gross_online)}
                  features={onlineFeatures}
                  bookingType="direct"
                  buttonText="Onlinekurs buchen"
                  onBook={() => handleBooking("Onlinekurs")}
                  isLoading={loadingCheckout === "Onlinekurs-direct"}
                  cmePoints={template.cme_online || undefined}
                />
              )}

              {hasPraxis && (
                <CourseCard
                  title="Praxiskurs"
                  description={
                    <>
                      Wende Dein <strong className="font-bold">bereits existierendes</strong> theoretisches
                      Wissen in der Praxis an.
                    </>
                  }
                  price={formatPrice(template.price_gross_praxis)}
                  features={praxisFeatures}
                  bookingType="dropdown"
                  dates={dynamicDates}
                  buttonText="Praxiskurs buchen"
                  additionalInfo="Praxiskurs-Standort: Berlin-Mitte"
                  onBook={(sessionId) => handleBooking("Praxiskurs", sessionId)}
                  isLoading={loadingCheckout?.startsWith("Praxiskurs-") || false}
                  selectedDateForLoading={loadingCheckout?.replace("Praxiskurs-", "")}
                  cmePoints={template.cme_praxis || undefined}
                />
              )}

              {hasKombi && (
                <CourseCard
                  title="Kombikurs"
                  description="Lerne die theoretischen Grundlagen online und die Praxis vor Ort an Proband:innen."
                  price={formatPrice(template.price_gross_kombi)}
                  features={kombiFeatures}
                  bookingType="dropdown"
                  dates={dynamicDates}
                  buttonText="Kombikurs buchen"
                  additionalInfo="Praxiskurs-Standort: Berlin-Mitte"
                  onBook={(sessionId) => handleBooking("Kombikurs", sessionId)}
                  highlighted={true}
                  isLoading={loadingCheckout?.startsWith("Kombikurs-") || false}
                  selectedDateForLoading={loadingCheckout?.replace("Kombikurs-", "")}
                  cmePoints={template.cme_kombi || undefined}
                />
              )}
            </div>
          );
        })()}

      </div>
    </section>
  );
}
