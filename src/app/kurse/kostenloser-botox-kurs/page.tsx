import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Heart, Lightbulb, ArrowRight } from "lucide-react";
import { Faq } from "../_components/sections/faq";
import { TYPO } from "../_components/typography";
import { SignupCta } from "./signup-cta";

export const dynamic = "force-static";

const SITE_URL = "https://kurse.ephia.de";
const PAGE_PATH = "/kurse/kostenloser-botox-kurs";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

export const metadata: Metadata = {
  title:
    "Kostenloser Botox-Kurs für Ärzt:innen | Online-Tutorial gratis | EPHIA",
  description:
    "Kostenloser Botox-Kurs für approbierte Ärzt:innen: Auszug aus dem EPHIA Grundkurs Botulinum mit Behandlungsvideo zur Glabella. 100 % gratis, online und im eigenen Tempo.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Kostenloser Botox-Kurs für Ärzt:innen | EPHIA",
    description:
      "Sieh Dir kostenlos einen Auszug aus unserem Grundkurs Botulinum an: Schönheitsideale, Anatomie und Behandlung der Glabella.",
    type: "website",
    siteName: "EPHIA",
    locale: "de_DE",
    url: PAGE_URL,
  },
};

const CHAPTERS = [
  {
    icon: Sparkles,
    label: "Kapitel 1",
    title: "Begrüßung & Kursübersicht",
    description:
      "Kurseinführung mit Dr. Sophia Wilk-Vollmann. Du lernst, was Dich erwartet, wie wir lehren und was EPHIA von klassischen ästhetischen Fortbildungen unterscheidet.",
  },
  {
    icon: Heart,
    label: "Kapitel 2",
    title: "Schönheitsideale & Hintergründe",
    description:
      "Diskriminierungssensible ästhetische Medizin: Ethnie, Gender und Alter. Warum es wichtig ist, Patient:innen mit Blick auf ihren sozialen und kulturellen Hintergrund zu verstehen, bevor Du Botox einsetzt.",
  },
  {
    icon: Lightbulb,
    label: "Kapitel 3",
    title: "Behandlung der Glabella",
    description:
      "Die Glabella ist eine der häufigsten Indikationen für Botox in der ästhetischen Medizin. Du lernst Anatomie, Wirkweise und Injektionspunkte und siehst die Behandlung in einem Lehrvideo an einer echten Patientin.",
  },
];

const FAQ_ITEMS = [
  {
    question: "Ist der Botox-Kurs wirklich kostenlos?",
    answer:
      "Ja, vollständig. Du bekommst freien Zugang zu drei Kapiteln aus unserem zertifizierten Grundkurs Botulinum, ohne versteckte Kosten, ohne automatische Verlängerung und ohne Kreditkartenangabe. Der kostenlose Auszug ist ein Vorgeschmack auf den vollständigen Onlinekurs.",
  },
  {
    question: "Wie viel Zeit benötige ich für das Tutorial?",
    answer:
      "Plane ungefähr 30 bis 45 Minuten ein. Du kannst den Kurs in einem Stück durcharbeiten oder in mehreren Sitzungen, ganz wie es Dir passt. Sobald Du Dich registriert hast, hast Du dauerhaft Zugriff auf die Lernplattform.",
  },
  {
    question: "Erhalte ich CME-Punkte für das kostenlose Botox-Tutorial?",
    answer:
      "Nein, der kostenlose Auszug ist als Vorgeschmack konzipiert und nicht CME-akkreditiert. Wenn Du CME-Punkte sammeln möchtest, ist der vollständige Grundkurs Botulinum der richtige nächste Schritt: er ist von der Ärztekammer Berlin mit 22 CME-Punkten akkreditiert.",
  },
  {
    question: "Wer kann am kostenlosen Botox-Kurs teilnehmen?",
    answer:
      "Der Kurs richtet sich ausschließlich an approbierte Ärzt:innen. Da Botulinum in Deutschland verschreibungspflichtig ist und die sichere Anwendung medizinisches Grundwissen voraussetzt, können wir keine Zugänge an Studierende, Pflegekräfte oder Heilpraktiker:innen vergeben.",
  },
  {
    question: "Brauche ich Vorerfahrung mit Botox oder Botulinum?",
    answer:
      "Nein. Das Tutorial ist explizit für Einsteiger:innen konzipiert. Du brauchst keine Vorerfahrung in der Behandlung mit Botulinum, nur Deine Approbation und etwas Zeit. Falls Du bereits behandelst, kannst Du das Tutorial als Auffrischung nutzen.",
  },
  {
    question: "Was kommt nach dem kostenlosen Tutorial?",
    answer:
      "Wenn Du nach dem Tutorial in die Praxis einsteigen willst, ist unser Grundkurs Botulinum der natürliche nächste Schritt. Er enthält alle Behandlungsvideos zu allen Indikationen, einen Praxistag mit echten Proband:innen und 22 CME-Punkte. Den Tutorial-Kurs kannst Du Dir auf den Grundkurs anrechnen lassen.",
  },
  {
    question: "Was ist der Unterschied zwischen Botox und Botulinum?",
    answer:
      "„Botox\" ist der bekannteste Markenname für ein Präparat aus Botulinumtoxin Typ A. Im medizinischen Sprachgebrauch ist „Botulinum\" oder „Botulinumtoxin\" der korrekte Wirkstoffname. Inhaltlich behandeln unsere Kurse die Anwendung von Botulinumtoxin in der ästhetischen und therapeutischen Medizin.",
  },
];

export default function KostenloserBotoxKursPage() {
  // Schema.org Course (price 0). Marks the offering as a free educational
  // resource so Google can surface it for "kostenlos" / "free course"
  // queries in both regular SERP and AI overviews.
  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Kostenloser Botox-Kurs für approbierte Ärzt:innen",
    description:
      "Kostenloser Auszug aus dem EPHIA Grundkurs Botulinum: drei Kapitel zu Schönheitsidealen, Anatomie und Behandlung der Glabella mit Lehrvideo.",
    url: PAGE_URL,
    provider: {
      "@type": "Organization",
      name: "EPHIA",
      url: "https://ephia.de",
    },
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: PAGE_URL,
    },
    hasCourseInstance: [
      {
        "@type": "CourseInstance",
        courseMode: "Online",
        courseWorkload: "PT45M",
        inLanguage: "de",
      },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "EPHIA", item: "https://ephia.de" },
      { "@type": "ListItem", position: 2, name: "Kurse", item: `${SITE_URL}/kurse` },
      {
        "@type": "ListItem",
        position: 3,
        name: "Kostenloser Botox-Kurs",
        item: PAGE_URL,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero */}
      <section className="bg-[#FAEBE1] pt-16 pb-16 md:pt-24 md:pb-20">
        <div className="max-w-4xl mx-auto px-5 md:px-8 text-center">
          <h1 className={`${TYPO.h1} text-4xl md:text-5xl lg:text-6xl mb-6`}>
            Kostenloser Botox-Kurs
            <br />
            für approbierte Ärzt:innen
          </h1>
          <p className="text-base md:text-[17px] leading-relaxed text-black/75 max-w-2xl mx-auto mb-10">
            Sieh Dir kostenlos einen Auszug aus unserem Grundkurs Botulinum an:{" "}
            <strong className="font-bold text-black">
              drei Kapitel zu Schönheitsidealen, Anatomie und der Behandlung der Glabella
            </strong>
            , inklusive Lehrvideo. Online und in Deinem Tempo.
          </p>

          <SignupCta size="hero" label="Jetzt kostenlos starten" />

          <p className="mt-6 text-sm text-black/60">
            100 % gratis · Keine Kreditkarte nötig · Nur für approbierte Ärzt:innen
          </p>
        </div>
      </section>

      {/* What's inside */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h2 className={`${TYPO.h2} mb-5`}>Was Du im Botox-Tutorial lernst</h2>
            <p className={TYPO.bodyLead}>
              Drei kompakte Kapitel aus unserem zertifizierten Grundkurs Botulinum, ausgewählt für einen sicheren Einstieg.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {CHAPTERS.map((chapter) => {
              const Icon = chapter.icon;
              return (
                <article
                  key={chapter.title}
                  className="bg-[#FAEBE1] rounded-[10px] p-6 md:p-8"
                >
                  <div className="mb-5 w-12 h-12 rounded-[10px] bg-[#0066FF]/10 flex items-center justify-center">
                    <Icon
                      className="w-6 h-6 text-[#0066FF]"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-xs font-semibold tracking-[0.15em] uppercase text-[#0066FF] mb-2">
                    {chapter.label}
                  </p>
                  <h3 className="text-lg md:text-xl font-bold mb-3 leading-tight">
                    {chapter.title}
                  </h3>
                  <p className="text-sm md:text-base text-black/75 leading-relaxed">
                    {chapter.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bridge to Grundkurs Botulinum */}
      <section className="bg-[#FAEBE1] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <div className="bg-white rounded-[10px] p-8 md:p-12 text-center">
            <p className="text-xs md:text-sm font-semibold tracking-[0.2em] text-[#0066FF] mb-4">
              NÄCHSTER SCHRITT
            </p>
            <h2 className={`${TYPO.h2} mb-5`}>Bereit für die Praxis?</h2>
            <p className="text-base md:text-lg text-black/75 leading-relaxed max-w-2xl mx-auto mb-8">
              Wenn Dir der kostenlose Auszug gefällt, ist unser{" "}
              <strong className="font-bold text-black">Grundkurs Botulinum</strong>{" "}
              der natürliche nächste Schritt. Vollständige Behandlungsvideos zu allen Indikationen, ein Praxistag mit echten Proband:innen und 22 CME-Punkte der Ärztekammer Berlin.
            </p>
            <Link
              href="/kurse/grundkurs-botulinum"
              className="inline-flex items-center gap-2 text-base md:text-lg font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-7 py-4 transition-colors"
            >
              Zum Grundkurs Botulinum
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <Faq content={{ heading: "FAQ zum kostenlosen Botox-Kurs", items: FAQ_ITEMS }} />

      {/* Final CTA */}
      <section className="py-16 md:py-20" style={{ backgroundColor: "#0066FF" }}>
        <div className="max-w-4xl mx-auto px-5 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 tracking-tight">
            Starte jetzt kostenlos in die ästhetische Medizin
          </h2>
          <SignupCta size="hero" variant="inverse" label="Jetzt kostenlos starten" />
        </div>
      </section>
    </>
  );
}
