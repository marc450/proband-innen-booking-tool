"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Check,
  Loader2,
  Award,
  ChevronDown,
  ArrowRight,
  BookOpen,
  Stethoscope,
  Users,
  Target,
  Clock,
  MapPin,
  Sparkles,
  GraduationCap,
  ShieldCheck,
  Mail,
  Calendar,
  Quote,
  Percent,
} from "lucide-react";
import type { CurriculumConfig } from "@/lib/curricula";
import type { CourseTemplate, CourseSession } from "@/lib/types";
import { CURRICULUM_COURSE_CONTENT } from "@/lib/curriculum-content";

interface Props {
  curriculum: CurriculumConfig;
  templates: CourseTemplate[];
  sessions: CourseSession[];
}

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

/* -------------------------------------------------------------------------- */
/*  Static curriculum content                                                 */
/* -------------------------------------------------------------------------- */

const PERSONAS = [
  {
    icon: Sparkles,
    title: "Du steigst gerade ein",
    description:
      "Du bist Ärzt:in und willst einen sicheren, leitliniengerechten Einstieg in die Botulinumtoxin-Therapie. Der Grundkurs gibt Dir das Fundament, der Rest des Curriculums baut Schritt für Schritt darauf auf.",
  },
  {
    icon: Target,
    title: "Du willst systematisch aufbauen",
    description:
      "Du hast bereits erste Erfahrungen mit Botulinum und möchtest Dein Wissen strukturiert erweitern. Therapeutische Indikationen wie Bruxismus, Migräne oder Hyperhidrose öffnen Dir neue Behandlungsfelder in Deiner Praxis.",
  },
  {
    icon: GraduationCap,
    title: "Du willst zur Masterclass",
    description:
      "Du behandelst schon länger und suchst Feinschliff auf Expert:innen-Niveau: fortgeschrittene Techniken, komplexe Fälle und souveränes Komplikationsmanagement. Das Curriculum führt Dich dorthin.",
  },
];

const OUTCOMES = [
  "Du führst Botulinum-Behandlungen sicher, anatomisch fundiert und leitliniengerecht durch.",
  "Du erkennst Kontraindikationen und berätst Deine Patient:innen professionell und diskriminierungssensibel.",
  "Du beherrschst therapeutische Indikationen wie Bruxismus, chronische Migräne, muskuläre Verspannungen und Hyperhidrose.",
  "Du integrierst medizinische Hautpflege in Deine Behandlungskonzepte und berätst ganzheitlich.",
  "Du gehst souverän mit Komplikationen um und hast klare Strategien für den Ernstfall.",
  "Du behandelst auf Masterclass-Niveau mit fortgeschrittenen Injektionstechniken.",
];

const FORMAT_POINTS = [
  {
    icon: BookOpen,
    title: "Online im eigenen Tempo",
    description:
      "Alle Theorie-Kapitel in praxisnahen Videos und Lernmodulen. Du lernst, wann und wo es Dir passt. 1,5 Jahre Zugriff inkl. Updates.",
  },
  {
    icon: Stethoscope,
    title: "Praxis an echten Proband:innen",
    description:
      "In den Kombikursen behandelst Du echte Proband:innen unter Aufsicht erfahrener Dozent:innen. Keine Phantommodelle, sondern der echte Fall.",
  },
  {
    icon: Users,
    title: "Kleine Gruppen",
    description:
      "Maximal 7 Teilnehmer:innen pro Praxiskurs. Dadurch bleibt genug Zeit für individuelles Feedback und Deine Fragen.",
  },
  {
    icon: MapPin,
    title: "Standort Berlin-Mitte",
    description:
      "Alle Praxiskurse finden in unseren Räumen in Berlin-Mitte statt. Gut erreichbar mit Bahn und Flugzeug.",
  },
  {
    icon: Clock,
    title: "Flexible Abfolge",
    description:
      "Du bestimmst, in welchem Tempo Du das Curriculum durchläufst. Die Online-Teile sind sofort verfügbar, die Praxiskurse buchst Du je nach Deinem Kalender.",
  },
  {
    icon: ShieldCheck,
    title: "Dozent:innen-Support",
    description:
      "Auch nach dem Kurs bleiben Dir unsere Dozent:innen über die Community erhalten. Stell Fragen, tausche Dich aus, bleib am Ball.",
  },
];

// Platzhalter: bitte durch echte Dozent:innen-Daten ersetzen
const INSTRUCTORS = [
  {
    name: "Dr. med. [Platzhalter]",
    title: "Fachärzt:in für Dermatologie",
    credentials:
      "Mehrjährige Erfahrung in der ästhetischen und therapeutischen Botulinum-Behandlung. Schwerpunkt Grundkurs und therapeutische Indikationen.",
  },
  {
    name: "Dr. med. [Platzhalter]",
    title: "Fachärzt:in für ästhetische Medizin",
    credentials:
      "Spezialisierung auf fortgeschrittene Injektionstechniken und Komplikationsmanagement. Leitet die Masterclass.",
  },
];

// Platzhalter: bitte durch echte Testimonials ersetzen
const TESTIMONIALS = [
  {
    quote:
      "Das Curriculum hat mir genau das gegeben, was ich brauchte: eine klare Struktur vom Einstieg bis zur Vertiefung. Besonders die Praxiskurse an echten Proband:innen waren unbezahlbar.",
    author: "Dr. med. [Platzhalter]",
    role: "Hausärztin, Hamburg",
  },
  {
    quote:
      "Ich habe lange nach einer Fortbildung gesucht, die wissenschaftlich fundiert und gleichzeitig praxisnah ist. EPHIA liefert genau das, und der Bündelrabatt macht es zum fairen Angebot.",
    author: "Dr. med. [Platzhalter]",
    role: "Allgemeinmediziner, München",
  },
  {
    quote:
      "Die Dozent:innen nehmen sich wirklich Zeit, die kleinen Gruppen sorgen für intensives Lernen. Nach dem Curriculum fühle ich mich endlich sicher im Umgang mit therapeutischen Indikationen.",
    author: "Dr. med. [Platzhalter]",
    role: "Dermatologin, Berlin",
  },
];

const FAQS = [
  {
    q: "Muss ich die Kurse in einer bestimmten Reihenfolge absolvieren?",
    a: "Wir empfehlen die Reihenfolge Grundkurs Botulinum → Medizinische Hautpflege → Aufbaukurs Therapeutische Indikationen → Masterclass, weil die Inhalte aufeinander aufbauen. Du kannst die Online-Teile parallel laufen lassen und die Praxiskurse flexibel im Rahmen der verfügbaren Termine buchen.",
  },
  {
    q: "Wie lange habe ich Zeit, alle 4 Kurse zu absolvieren?",
    a: "Du hast 1,5 Jahre Zugriff auf die Online-Inhalte inklusive Updates. Die Praxiskurse solltest Du innerhalb dieses Zeitraums wahrnehmen. Das reicht auch bei vollem Praxisalltag gut aus.",
  },
  {
    q: "Kann ich Termine später verschieben?",
    a: "Ja, Du kannst Praxiskurs-Termine nach Absprache verschieben, solange noch Plätze in anderen Gruppen verfügbar sind. Schreib uns einfach eine Mail an customerlove@ephia.de.",
  },
  {
    q: "Wann finden die Praxiskurse statt?",
    a: "Alle verfügbaren Termine siehst Du direkt auf dieser Seite bei den jeweiligen Kurskarten. Die Auswahl wird regelmäßig aktualisiert.",
  },
  {
    q: "Ist Ratenzahlung möglich?",
    a: "Ja, Du kannst bei der Bezahlung Klarna wählen und in Raten zahlen.",
  },
  {
    q: "Bekomme ich eine Rechnung auf meine Praxis?",
    a: "Ja, Du erhältst automatisch eine ordnungsgemäße Rechnung mit Deinen im Checkout eingegebenen Praxisdaten. Diese kannst Du als Fortbildung steuerlich geltend machen.",
  },
  {
    q: "Erhalte ich CME-Punkte?",
    a: "Ja, jeder Kurs im Curriculum ist CME-zertifiziert. Die genaue Anzahl siehst Du am Badge auf jeder Kurskarte weiter unten.",
  },
  {
    q: "Was, wenn ich einen Praxistermin verpassen muss?",
    a: "Kein Stress. Melde Dich rechtzeitig bei uns, wir finden einen Ersatztermin in einer der nächsten Gruppen.",
  },
  {
    q: "Kann ich auch nur einzelne Kurse buchen statt des Komplettpakets?",
    a: "Ja, jeder Kurs ist auch einzeln auf ephia.de buchbar. Das Curriculum spart Dir allerdings 10% gegenüber der Einzelbuchung und gibt Dir die klare, aufeinander aufbauende Lernstruktur.",
  },
  {
    q: "Für wen ist das Curriculum geeignet?",
    a: "Das Curriculum richtet sich an approbierte Ärzt:innen, die in die Botulinumtoxin-Therapie einsteigen oder ihre bestehenden Kenntnisse systematisch vertiefen wollen. Weitere Voraussetzungen gibt es nicht.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

export function CurriculumPage({ curriculum, templates, sessions: initialSessions }: Props) {
  const [sessions, setSessions] = useState(initialSessions);
  const [selectedSessions, setSelectedSessions] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
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

  const getCourseCme = (template: CourseTemplate) => {
    const config = getCourseConfig(template.course_key || "");
    if (config?.courseType === "Onlinekurs") return template.cme_online;
    return template.cme_kombi;
  };

  const isOnlineCourse = (courseKey: string) =>
    getCourseConfig(courseKey)?.courseType === "Onlinekurs";

  const toggleCard = (courseKey: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(courseKey)) next.delete(courseKey);
      else next.add(courseKey);
      return next;
    });
  };

  // Pricing
  const totalGross = templates.reduce(
    (sum, t) => sum + (getCoursePrice(t) || 0),
    0
  );
  const discountedTotal = totalGross * (1 - curriculum.discountPercent / 100);
  const savings = totalGross - discountedTotal;

  const allSessionsSelected = templates.every((t) => {
    const courseKey = t.course_key || "";
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
      {/* ================================================================== */}
      {/*  1. Hero                                                            */}
      {/* ================================================================== */}
      <section className="pt-16 pb-8 px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          EPHIA CURRICULUM
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 max-w-3xl mx-auto leading-tight">
          {curriculum.title}
        </h1>
        <p className="text-xl text-white/90 max-w-2xl mx-auto mb-3">
          {curriculum.subtitle}
        </p>
        <p className="text-white/75 max-w-xl mx-auto mb-8">
          {curriculum.description}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <a
            href="#lernweg"
            className="inline-flex items-center justify-center gap-2 bg-white text-[#0066FF] font-bold rounded-[10px] transition-transform hover:scale-[1.02]"
            style={{ fontSize: "1.6rem", padding: "15px 25px", letterSpacing: 0 }}
          >
            Curriculum buchen
            <ArrowRight className="w-5 h-5" />
          </a>
          <a
            href="mailto:customerlove@ephia.de?subject=Curriculum%20Botulinum%20-%20Beratung"
            className="inline-flex items-center justify-center gap-2 text-white/90 font-semibold hover:text-white underline underline-offset-4"
          >
            <Mail className="w-4 h-4" />
            Kostenloses Beratungsgespräch
          </a>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  2. Stats bar                                                       */}
      {/* ================================================================== */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: BookOpen, label: `${templates.length} aufeinander aufbauende Kurse` },
            { icon: Award, label: "CME-zertifiziert" },
            { icon: Users, label: "Max. 7 pro Praxiskurs" },
            { icon: Percent, label: `${curriculum.discountPercent}% Bündelrabatt` },
          ].map(({ icon: Icon, label }, i) => (
            <div
              key={i}
              className="bg-white/10 backdrop-blur rounded-[10px] px-4 py-3 flex items-center gap-3 text-white"
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-semibold leading-tight">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================== */}
      {/*  3. Für wen                                                         */}
      {/* ================================================================== */}
      <section className="bg-[#FAEBE1] py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-3">
              Für wen ist das Curriculum?
            </h2>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Egal, wo Du stehst: das Curriculum bringt Dich auf das nächste Level.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {PERSONAS.map(({ icon: Icon, title, description }, i) => (
              <div
                key={i}
                className="bg-white rounded-[10px] p-6 shadow-sm flex flex-col"
              >
                <div className="w-12 h-12 rounded-full bg-[#0066FF]/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-[#0066FF]" />
                </div>
                <h3 className="text-lg font-bold text-black mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-600 mt-8">
            Voraussetzung: approbierte:r Ärzt:in oder medizinische:r Fachangestellte:r mit entsprechender Qualifikation.
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  4. Outcomes                                                        */}
      {/* ================================================================== */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Das kannst Du danach
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto">
              Sechs konkrete Kompetenzen, die Du nach Abschluss des Curriculums sicher beherrschst.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {OUTCOMES.map((outcome, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur rounded-[10px] p-5 flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-[#0066FF]" strokeWidth={3} />
                </div>
                <p className="text-white text-sm leading-relaxed font-medium">
                  {outcome}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  5. Format & Ablauf                                                 */}
      {/* ================================================================== */}
      <section className="bg-[#FAEBE1] py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-3">
              So läuft das Curriculum ab
            </h2>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Online-Theorie im eigenen Tempo, Praxis an echten Proband:innen, kleine Gruppen.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FORMAT_POINTS.map(({ icon: Icon, title, description }, i) => (
              <div
                key={i}
                className="bg-white rounded-[10px] p-6 shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-[#0066FF]/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[#0066FF]" />
                </div>
                <h3 className="text-base font-bold text-black mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  6. Dozent:innen                                                    */}
      {/* ================================================================== */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Deine Dozent:innen
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto">
              Erfahrene Ärzt:innen, die täglich selbst behandeln und wissen, worauf es in der Praxis ankommt.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {INSTRUCTORS.map((instructor, i) => (
              <div
                key={i}
                className="bg-white rounded-[10px] p-6 shadow-sm flex gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-[#FAEBE1] flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-7 h-7 text-[#0066FF]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black">{instructor.name}</h3>
                  <p className="text-sm text-[#0066FF] font-semibold mb-2">
                    {instructor.title}
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {instructor.credentials}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  7. Zertifizierung                                                  */}
      {/* ================================================================== */}
      <section className="bg-[#FAEBE1] py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-3">
              Zertifizierung & Anerkennung
            </h2>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Jeder Kurs im Curriculum ist CME-zertifiziert. Du erhältst nach Abschluss ein Zertifikat, das Du in Deiner Praxis vorweisen kannst.
            </p>
          </div>
          <div className="bg-white rounded-[10px] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-[#0066FF] flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-black">CME-Punkte je Kurs</h3>
            </div>
            <div className="space-y-3">
              {templates.map((template) => {
                const courseKey = template.course_key || "";
                const content = CURRICULUM_COURSE_CONTENT[courseKey];
                const cme = getCourseCme(template);
                return (
                  <div
                    key={template.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-sm font-semibold text-black">
                      {content?.title || template.title}
                    </span>
                    <span className="text-sm font-bold text-[#0066FF]">
                      {cme || "CME-zertifiziert"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  8. Lernweg (Journey + Bundle CTA) - bestehende Funktionalität      */}
      {/* ================================================================== */}
      <section id="lernweg" className="py-16 px-4">
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Dein Lernweg
          </h2>
          <p className="text-white/80">
            Vier Kurse, die aufeinander aufbauen. Wähle für jeden Praxisteil einen Termin und sichere Dir den Bündelrabatt.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="space-y-0">
            {templates.map((template, index) => {
              const courseKey = template.course_key || "";
              const courseSessions = getSessionsForTemplate(template.id);
              const selectedId = selectedSessions[courseKey];
              const selectedSession = courseSessions.find((s) => s.id === selectedId);
              const isLast = index === templates.length - 1;
              const isOnline = isOnlineCourse(courseKey);
              const isExpanded = expandedCards.has(courseKey);
              const content = CURRICULUM_COURSE_CONTENT[courseKey];

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
                            {content?.title || template.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {isOnline ? "Onlinekurs" : "Onlinekurs und Praxiskurs"}
                          </p>
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
                      {/* Session picker (only for Kombikurs) */}
                      {!isOnline && (
                        <div
                          ref={(el) => { dropdownRefs.current[courseKey] = el; }}
                          className="relative mb-4"
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
                                : "Praxiskurs-Termin auswählen"}
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
                      {isOnline && (
                        <p className="text-sm text-gray-500 mb-4">
                          Sofort verfügbar nach Kauf
                        </p>
                      )}

                      {/* Details accordion toggle */}
                      {content && (
                        <button
                          type="button"
                          onClick={() => toggleCard(courseKey)}
                          className="w-full flex items-center justify-between text-sm font-semibold text-[#0066FF] hover:text-[#0055DD] transition-colors py-1"
                        >
                          <span>Kursdetails ansehen</span>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      )}

                      {/* Accordion content */}
                      {isExpanded && content && (
                        <div className="mt-4 space-y-5">
                          {/* Lernziele */}
                          <div>
                            <h4 className="text-sm font-bold text-black mb-2">Lernziele</h4>
                            <ul className="space-y-1.5">
                              {content.lernziele.map((ziel, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <Check className="w-4 h-4 text-[#0066FF] flex-shrink-0 mt-0.5" />
                                  <span className="text-gray-700">{ziel}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Two-column: Onlinekurs + Praxiskurs */}
                          <div className={`grid gap-4 ${content.praxiskursFeatures ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                            {/* Onlinekurs column */}
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <BookOpen className="w-4 h-4 text-[#0066FF]" />
                                <h5 className="text-sm font-bold text-black">
                                  {content.praxiskursFeatures ? "Inkludierter Onlinekurs" : "Onlinekurs"}
                                </h5>
                              </div>
                              <ul className="space-y-1.5">
                                {content.onlinekursFeatures.map((f, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs">
                                    <Check className="w-3.5 h-3.5 text-[#0066FF] flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-600">{f}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Praxiskurs column */}
                            {content.praxiskursFeatures && (
                              <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Stethoscope className="w-4 h-4 text-[#0066FF]" />
                                  <h5 className="text-sm font-bold text-black">Inkludierter Praxiskurs</h5>
                                </div>
                                <ul className="space-y-1.5">
                                  {content.praxiskursFeatures.map((f, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs">
                                      <Check className="w-3.5 h-3.5 text-[#0066FF] flex-shrink-0 mt-0.5" />
                                      <span className="text-gray-600">{f}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Mehr erfahren link */}
                          <a
                            href={content.landingPage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-[#0066FF] hover:underline font-medium"
                          >
                            Mehr erfahren auf ephia.de
                            <ArrowRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bundle CTA */}
        <div className="max-w-3xl mx-auto pt-4">
          <div className="bg-white rounded-[10px] shadow-2xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-black mb-2">
                Komplettpaket {curriculum.title}
              </h2>
              <p className="text-gray-600">
                Alle {templates.length} Kurse in einem Paket
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
                        ? `${CURRICULUM_COURSE_CONTENT[courseKey]?.title || t.title}: Termin ausgewählt`
                        : `${CURRICULUM_COURSE_CONTENT[courseKey]?.title || t.title}: Termin auswählen`
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
      </section>

      {/* ================================================================== */}
      {/*  9. Testimonials                                                    */}
      {/* ================================================================== */}
      <section className="bg-[#FAEBE1] py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-3">
              Was andere Ärzt:innen sagen
            </h2>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Ehrliche Stimmen aus der EPHIA-Community.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((testimonial, i) => (
              <div
                key={i}
                className="bg-white rounded-[10px] p-6 shadow-sm flex flex-col"
              >
                <Quote className="w-8 h-8 text-[#0066FF]/20 mb-3" />
                <p className="text-sm text-gray-700 leading-relaxed mb-4 flex-1">
                  {testimonial.quote}
                </p>
                <div className="pt-4 border-t border-gray-100">
                  <div className="text-sm font-bold text-black">
                    {testimonial.author}
                  </div>
                  <div className="text-xs text-gray-500">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  10. FAQ                                                            */}
      {/* ================================================================== */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Häufige Fragen
            </h2>
            <p className="text-white/80">
              Alles, was Du vor der Buchung wissen willst.
            </p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="bg-white rounded-[10px] overflow-hidden shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm md:text-base font-bold text-black">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#0066FF] flex-shrink-0 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/*  11. Kontakt                                                        */}
      {/* ================================================================== */}
      <section className="bg-[#FAEBE1] py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-3">
            Noch Fragen? Wir sind da.
          </h2>
          <p className="text-gray-700 max-w-xl mx-auto mb-8">
            Bei einer Investition dieser Größe willst Du sicher sein. Schreib uns oder buch Dir ein kostenloses Beratungsgespräch. Wir melden uns innerhalb von 24 Stunden zurück.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              href="mailto:customerlove@ephia.de?subject=Curriculum%20Botulinum%20-%20Beratung"
              className="inline-flex items-center justify-center gap-2 bg-[#0066FF] text-white font-bold rounded-[10px] hover:bg-[#0055DD] transition-colors"
              style={{ fontSize: "1.6rem", padding: "15px 25px", letterSpacing: 0 }}
            >
              <Mail className="w-5 h-5" />
              E-Mail schreiben
            </a>
            <a
              href="#lernweg"
              className="inline-flex items-center justify-center gap-2 text-[#0066FF] font-semibold hover:underline"
            >
              <Calendar className="w-4 h-4" />
              Zurück zur Buchung
            </a>
          </div>
          <p className="text-xs text-gray-500 mt-8">
            EPHIA · customerlove@ephia.de · Berlin-Mitte
          </p>
        </div>
      </section>
    </div>
  );
}
