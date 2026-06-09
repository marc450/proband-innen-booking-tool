import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  getProfilePeople,
  getPersonBySlug,
} from "@/content/kurse/team";
import type { Person, CurriculumItem } from "@/content/kurse/team-types";
import { Header } from "@/app/kurse/_components/header";
import { Footer } from "@/app/kurse/_components/footer";
import { TYPO } from "@/app/kurse/_components/typography";

// Only the known profile slugs render; anything else 404s.
export const dynamicParams = false;

const SITE_URL = "https://ephia.de";

// Default expertise topics for the Person `knowsAbout` schema field.
// Overridable per person via `person.knowsAbout`.
const DEFAULT_KNOWS_ABOUT = [
  "Ästhetische Medizin",
  "Botulinumtoxin-Behandlung",
  "Dermalfiller",
  "Faltenbehandlung",
];

/** U+2011 non-breaking hyphen is used in display names; normalise it for
 *  schema/meta plain-text output. */
function plainName(name: string): string {
  return name.replace(/‑/g, "-");
}

/** Extract the given name from a display name, stripping leading titles
 *  ("Dr.", "Prof. Dr.", …). Used for the warm, first-name CTA. */
function firstName(name: string): string {
  const withoutTitles = plainName(name)
    .replace(/^((Prof\.|Dr\.|Priv\.-Doz\.|Dipl\.\S*)\s+)+/i, "")
    .trim();
  return withoutTitles.split(" ")[0] || plainName(name);
}

// Friendly labels for the visible "Im Netz" links (same data as the
// Person `sameAs` schema). Unknown hosts fall back to the bare hostname;
// "Über mich"-style pages get a generic label.
const HOST_LABELS: Record<string, string> = {
  "linkedin.com": "LinkedIn",
  "instagram.com": "Instagram",
  "researchgate.net": "ResearchGate",
  "arzt-auskunft.de": "Arzt-Auskunft",
  "jameda.de": "Jameda",
  "open.spotify.com": "Spotify",
  "k5.de": "K5",
  "wdr.de": "WDR",
  "tagesspiegel.de": "Tagesspiegel",
  "dransay.com": "Dr. Ansay",
};

function linkLabel(url: string): string {
  let host = "";
  let path = "";
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\d*\./, "");
    path = u.pathname;
  } catch {
    return url;
  }
  if (HOST_LABELS[host]) return HOST_LABELS[host];
  if (/ueber|about/i.test(path)) return "Über mich";
  return host;
}

/** Flatten the "Fachgesellschaftsmitgliedschaften" curriculum section
 *  into a list of organisation names for the Person `memberOf` schema. */
function extractMemberships(person: Person): string[] {
  const section = person.curriculum?.sections.find((s) =>
    /Fachgesellschaft|Mitgliedschaft/i.test(s.heading),
  );
  if (!section?.items) return [];
  const out: string[] = [];
  for (const item of section.items) {
    if (typeof item === "string") out.push(item);
    else out.push(...item.items);
  }
  return out;
}

export function generateStaticParams() {
  return getProfilePeople().map((p) => ({ slug: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const person = getPersonBySlug(slug);
  if (!person) return { title: "EPHIA" };

  const name = plainName(person.name);
  const title = `${name}, ${person.role} | EPHIA`;
  const description =
    person.shortBio ??
    `${name}, ${person.role} bei EPHIA, der Akademie für verantwortungsvolle ästhetische Medizin.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "EPHIA",
      locale: "de_DE",
      ...(person.imagePath ? { images: [person.imagePath] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(person.imagePath ? { images: [person.imagePath] } : {}),
    },
    alternates: {
      canonical: `${SITE_URL}/team/${person.id}`,
    },
  };
}

export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const person = getPersonBySlug(slug);
  if (!person) return notFound();

  const name = plainName(person.name);
  const profileUrl = `${SITE_URL}/team/${person.id}`;
  const memberships = extractMemberships(person);
  const knowsAbout = person.knowsAbout ?? DEFAULT_KNOWS_ABOUT;
  const sameAs = (person.sameAs ?? []).filter(Boolean);
  const isDozent = /Dozent/.test(person.role);
  const ctaHeading = isDozent
    ? `Lerne bei ${firstName(person.name)} und unserem Team`
    : "Entdecke unsere Kurse";

  // Person JSON-LD — the EEAT signal: connects the (real, credentialed)
  // instructor to EPHIA's medical course content.
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: profileUrl,
    jobTitle: person.role,
    ...(person.imagePath ? { image: person.imagePath } : {}),
    ...(person.shortBio ? { description: person.shortBio } : {}),
    worksFor: {
      "@type": "Organization",
      name: "EPHIA",
      url: SITE_URL,
    },
    ...(knowsAbout.length ? { knowsAbout } : {}),
    ...(person.medicalSpecialty
      ? { medicalSpecialty: person.medicalSpecialty }
      : {}),
    ...(memberships.length
      ? {
          memberOf: memberships.map((m) => ({
            "@type": "Organization",
            name: m,
          })),
        }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "EPHIA", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Team",
        item: `${SITE_URL}/team`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name,
        item: profileUrl,
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAEBE1] text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />

      <main className="flex-1">
        <section className="bg-[#FAEBE1] pt-12 md:pt-20 pb-10 md:pb-14">
          <div className="max-w-4xl mx-auto px-5 md:px-8">
            <Link
              href="/team"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0066FF] hover:text-[#0055DD] transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
              <span>Zurück zum Team</span>
            </Link>

            <div className="flex flex-col md:flex-row gap-7 md:gap-10 items-start">
              {person.imagePath && (
                <div className="relative w-32 h-32 md:w-44 md:h-44 shrink-0 rounded-full overflow-hidden bg-black/5">
                  <Image
                    src={person.imagePath}
                    alt={person.imageAlt ?? name}
                    fill
                    quality={90}
                    sizes="176px"
                    className="object-cover object-[center_30%]"
                    priority
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className={`${TYPO.h1} text-black`}>{person.name}</h1>
                <p className="mt-2 text-lg md:text-xl font-semibold text-[#0066FF]">
                  {person.role}
                </p>
                {person.curriculum?.tagline && (
                  <p className={`${TYPO.bodyLead} mt-4`}>
                    {person.curriculum.tagline}
                  </p>
                )}
                {person.shortBio && (
                  <p className={`${TYPO.bodyLead} mt-4`}>{person.shortBio}</p>
                )}

                {sameAs.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-black/50 mb-3">
                      Im Netz
                    </p>
                    <ul className="flex flex-wrap gap-2.5">
                      {sameAs.map((url) => (
                        <li key={url}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-[10px] bg-white px-3.5 py-2 text-sm font-semibold text-black/80 hover:text-[#0066FF] transition-colors"
                          >
                            <span>{linkLabel(url)}</span>
                            <ExternalLink
                              className="w-3.5 h-3.5 text-black/40"
                              strokeWidth={2.25}
                              aria-hidden="true"
                            />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {person.curriculum && (
          <section className="bg-[#FAEBE1] pb-16 md:pb-24">
            <div className="max-w-4xl mx-auto px-5 md:px-8">
              <div className="bg-white rounded-[10px] p-6 md:p-10 flex flex-col gap-8 md:gap-10">
                {person.curriculum.sections.map((section) => (
                  <section key={section.heading}>
                    <h2 className="text-xl md:text-2xl font-bold text-black mb-3 tracking-wide">
                      {section.heading}
                    </h2>
                    {section.intro && (
                      <p className={`${TYPO.bodyCard} mb-4`}>{section.intro}</p>
                    )}
                    {section.items && section.items.length > 0 && (
                      <ul className="flex flex-col gap-2.5">
                        {section.items.map((item, i) => (
                          <CurriculumRow key={i} item={item} />
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="bg-[#FAEBE1] pb-20 md:pb-28">
          <div className="max-w-4xl mx-auto px-5 md:px-8">
            <div className="bg-[#0066FF] rounded-[10px] p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
                {ctaHeading}
              </h2>
              <Link
                href="/unsere-kurse"
                className="inline-flex items-center justify-center rounded-[10px] bg-[#FAEBE1] text-[#0066FF] font-bold text-base md:text-lg px-7 py-4 hover:bg-white transition-colors"
              >
                Alle Kurse ansehen
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function CurriculumRow({ item }: { item: CurriculumItem }) {
  if (typeof item === "string") {
    return (
      <li className="flex gap-2.5 text-sm md:text-base text-black/75 leading-relaxed">
        <span
          aria-hidden="true"
          className="mt-[0.55em] w-1.5 h-1.5 rounded-full bg-[#0066FF] shrink-0"
        />
        <span>{item}</span>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-1.5">
      <span className="text-sm md:text-base font-semibold text-black">
        {item.label}
      </span>
      <ul className="flex flex-col gap-1.5 pl-1">
        {item.items.map((sub, i) => (
          <li
            key={i}
            className="flex gap-2.5 text-sm md:text-base text-black/75 leading-relaxed"
          >
            <span
              aria-hidden="true"
              className="mt-[0.55em] w-1.5 h-1.5 rounded-full bg-[#0066FF] shrink-0"
            />
            <span>{sub}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}
