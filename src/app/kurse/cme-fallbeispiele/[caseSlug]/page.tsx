import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TYPO } from "../../_components/typography";
import {
  getAllCaseSlugs,
  getCaseStudy,
  type CaseStudy,
} from "@/content/cme-fallbeispiele";

const HUB_URL = "https://ephia.de/cme-fallbeispiele";

export function generateStaticParams() {
  return getAllCaseSlugs().map((caseSlug) => ({ caseSlug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ caseSlug: string }>;
}): Promise<Metadata> {
  const { caseSlug } = await params;
  const c = getCaseStudy(caseSlug);
  if (!c) return { title: "Fallbeispiel nicht gefunden | EPHIA" };

  const url = `${HUB_URL}/${c.slug}`;
  return {
    title: `${c.metaTitle} | EPHIA`,
    description: c.metaDescription,
    alternates: { canonical: url },
    // Unpublished spokes render for local review but must never be
    // indexed or surfaced. Flipping published: true (with real content)
    // is what makes the page indexable.
    robots: c.published ? undefined : { index: false, follow: false },
  };
}

function formatDateDe(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ];
  if (!y || !m || !d) return iso;
  return `${d}. ${months[m - 1]} ${y}`;
}

function buildJsonLd(c: CaseStudy) {
  const url = `${HUB_URL}/${c.slug}`;
  const medicalWebPage = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: c.title,
    description: c.metaDescription,
    url,
    inLanguage: "de",
    datePublished: c.publishedIso,
    dateModified: c.updatedIso,
    audience: { "@type": "MedicalAudience", audienceType: "Physician" },
    author: { "@type": "Person", name: c.author.name },
    publisher: {
      "@type": "Organization",
      name: "EPHIA",
      url: "https://ephia.de",
    },
  };
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "EPHIA", item: "https://ephia.de" },
      { "@type": "ListItem", position: 2, name: "CME-Fallbeispiele", item: HUB_URL },
      { "@type": "ListItem", position: 3, name: c.title, item: url },
    ],
  };
  return { medicalWebPage, faqPage, breadcrumb };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ caseSlug: string }>;
}) {
  const { caseSlug } = await params;
  const c = getCaseStudy(caseSlug);
  if (!c) notFound();

  const jsonLd = buildJsonLd(c);

  return (
    <>
      {/* Hero */}
      <section className="bg-[#FAEBE1] pt-12 md:pt-16 pb-8 md:pb-10">
        <div className="max-w-2xl mx-auto px-5 md:px-8">
          <nav className="text-sm font-medium text-black/50">
            <Link href="/kurse/cme-fallbeispiele" className="hover:text-[#0066FF]">
              CME-Fallbeispiele
            </Link>
            <span className="mx-2">/</span>
            <span className="text-black/70">{c.type}</span>
          </nav>
          <h1 className={`${TYPO.h1} text-black mt-4`}>{c.title}</h1>
          <p className="mt-4 text-sm font-medium text-black/55">
            Von {c.author.name}, {c.author.role}. Aktualisiert am{" "}
            {formatDateDe(c.updatedIso)}.
          </p>
          <div className="mt-6 flex flex-col gap-6 md:gap-7">
            {c.lead.map((p, i) => (
              <p key={i} className={`${TYPO.bodyLead} text-black/80`}>
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* CME learning objective callout */}
      <section className="bg-[#FAEBE1] pb-4">
        <div className="max-w-2xl mx-auto px-5 md:px-8">
          <div className="rounded-[10px] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#0066FF]">
              Lernziel
            </h2>
            <p className={`${TYPO.bodyCard} mt-2`}>{c.cmeObjective}</p>
          </div>
        </div>
      </section>

      {/* Body sections */}
      <section className="bg-[#FAEBE1] pb-10 md:pb-14">
        <div className="max-w-2xl mx-auto px-5 md:px-8">
          <div className="flex flex-col gap-10 md:gap-12">
            {c.sections.map((s, i) => (
              <div key={i}>
                <h2 className={`${TYPO.h3} text-black`}>{s.heading}</h2>
                {s.paragraphs && (
                  <div className="mt-4 flex flex-col gap-4">
                    {s.paragraphs.map((p, j) => (
                      <p key={j} className={`${TYPO.bodyLead} text-black/80`}>
                        {p}
                      </p>
                    ))}
                  </div>
                )}
                {s.bullets && s.bullets.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-2 pl-5 list-disc">
                    {s.bullets.map((b, j) => (
                      <li key={j} className={`${TYPO.bodyLead} text-black/80`}>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                {s.afterBullets && s.afterBullets.length > 0 && (
                  <div className="mt-4 flex flex-col gap-4">
                    {s.afterBullets.map((p, j) => (
                      <p key={j} className={`${TYPO.bodyLead} text-black/80`}>
                        {p}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {c.faq.length > 0 && (
        <section className="bg-[#FAEBE1] pb-10 md:pb-14">
          <div className="max-w-2xl mx-auto px-5 md:px-8">
            <h2 className={`${TYPO.h3} text-black`}>Häufige Fragen</h2>
            <div className="mt-5 flex flex-col gap-3">
              {c.faq.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-[10px] bg-white p-5 shadow-sm"
                >
                  <summary className="cursor-pointer list-none font-bold text-black marker:hidden">
                    {f.question}
                  </summary>
                  <p className={`${TYPO.bodyCard} mt-3`}>{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sources */}
      {c.sources.length > 0 && (
        <section className="bg-[#FAEBE1] pb-10 md:pb-14">
          <div className="max-w-2xl mx-auto px-5 md:px-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-black/50">
              Quellen
            </h2>
            <ul className="mt-3 flex flex-col gap-1.5 list-decimal pl-5">
              {c.sources.map((s, i) => (
                <li key={i} className={`${TYPO.bodySmall} text-black/55`}>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Course CTA + author box */}
      <section className="bg-[#FAEBE1] pb-24 md:pb-32">
        <div className="max-w-2xl mx-auto px-5 md:px-8 flex flex-col gap-6">
          <div className="rounded-[10px] bg-white p-6 shadow-sm">
            <p className={`${TYPO.bodyCard} text-black/70`}>
              {c.course.intro ?? "Dieses Thema vertiefen wir praxisnah im Kurs:"}
            </p>
            <Link
              href={c.course.href}
              className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-[#0066FF] px-7 py-4 text-base font-bold text-white transition-colors hover:bg-[#0055DD]"
            >
              {c.course.label}
            </Link>
          </div>

          <div className="rounded-[10px] bg-white/60 p-5">
            <p className="text-sm font-bold text-black">{c.author.name}</p>
            <p className={`${TYPO.bodySmall} mt-0.5`}>{c.author.role}</p>
          </div>

          <Link
            href="/kurse/cme-fallbeispiele"
            className="text-sm font-bold text-[#0066FF]"
          >
            ← Alle CME-Fallbeispiele
          </Link>
        </div>
      </section>

      {/* JSON-LD only when the case study is actually live. */}
      {c.published && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.medicalWebPage) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.faqPage) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.breadcrumb) }}
          />
        </>
      )}
    </>
  );
}
