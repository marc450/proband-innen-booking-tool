import type { Metadata } from "next";
import Link from "next/link";
import { TYPO } from "../_components/typography";
import {
  getPublishedCaseStudies,
  UPCOMING_CASE_STUDIES,
} from "@/content/cme-fallbeispiele";

const PAGE_URL = "https://ephia.de/cme-fallbeispiele";

export const metadata: Metadata = {
  title: "CME-Fallbeispiele | EPHIA",
  description:
    "Peer-reviewed, CME-orientierte Kasuistiken unserer Dozent:innen: Entscheidungslogik, Anatomie und Komplikationsmanagement in der ästhetischen Medizin. Indikation vor Intervention.",
  alternates: { canonical: PAGE_URL },
};

export default function CmeFallbeispieleHubPage() {
  const published = getPublishedCaseStudies();

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "CME-Fallbeispiele",
    description:
      "CME-orientierte klinische Fallbeispiele aus der ästhetischen Medizin, verfasst von EPHIA-Dozent:innen.",
    url: PAGE_URL,
    isPartOf: { "@type": "WebSite", name: "EPHIA", url: "https://ephia.de" },
    hasPart: published.map((c) => ({
      "@type": "MedicalWebPage",
      name: c.title,
      url: `${PAGE_URL}/${c.slug}`,
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "EPHIA", item: "https://ephia.de" },
      {
        "@type": "ListItem",
        position: 2,
        name: "CME-Fallbeispiele",
        item: PAGE_URL,
      },
    ],
  };

  return (
    <>
      {/* Hero */}
      <section className="bg-[#FAEBE1] pt-16 md:pt-24 pb-10 md:pb-14">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <span className="inline-block rounded-full bg-[#0066FF]/10 px-4 py-1.5 text-sm font-bold text-[#0066FF]">
            CME-orientiert
          </span>
          <h1 className={`${TYPO.h1} text-black mt-5`}>CME-Fallbeispiele</h1>
          <p className={`${TYPO.bodyLead} text-black/80 mt-5`}>
            Klinische Kasuistiken unserer Dozent:innen. Entscheidungslogik,
            Anatomie und Komplikationsmanagement, Schritt für Schritt
            nachvollziehbar. Indikation vor Intervention.
          </p>
        </div>
      </section>

      {/* Published case studies */}
      <section className="bg-[#FAEBE1] pb-16 md:pb-20">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          {published.length === 0 ? (
            <p className={`${TYPO.bodyLead} text-black/60 text-center`}>
              Die ersten Fallbeispiele erscheinen in Kürze.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {published.map((c) => (
                <Link
                  key={c.slug}
                  href={`/cme-fallbeispiele/${c.slug}`}
                  className="group block rounded-[10px] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="inline-block rounded-full bg-[#0066FF]/10 px-3 py-1 text-xs font-bold text-[#0066FF]">
                    {c.type}
                  </span>
                  <h2 className={`${TYPO.h4} text-black mt-3 group-hover:text-[#0066FF]`}>
                    {c.title}
                  </h2>
                  <p className={`${TYPO.bodyCard} mt-2`}>{c.teaser}</p>
                  <span className="mt-4 inline-block text-sm font-bold text-[#0066FF]">
                    Fallbeispiel lesen
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Roadmap */}
      {UPCOMING_CASE_STUDIES.length > 0 && (
        <section className="bg-[#FAEBE1] pb-24 md:pb-32">
          <div className="max-w-4xl mx-auto px-5 md:px-8">
            <h2 className={`${TYPO.h3} text-black/80`}>In Vorbereitung</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {UPCOMING_CASE_STUDIES.map((c) => (
                <div
                  key={c.title}
                  className="flex items-start gap-3 rounded-[10px] bg-white/50 p-4"
                >
                  <span className="mt-0.5 inline-block rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-black/50">
                    {c.type}
                  </span>
                  <p className={`${TYPO.bodyCard} text-black/60`}>{c.title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  );
}
