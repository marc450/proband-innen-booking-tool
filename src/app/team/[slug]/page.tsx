import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  getProfilePeople,
  getPersonBySlug,
} from "@/content/kurse/team";
import type {
  Person,
  CurriculumItem,
  MediaAppearance,
} from "@/content/kurse/team-types";
import { Header } from "@/app/kurse/_components/header";
import { Footer } from "@/app/kurse/_components/footer";
import { TYPO } from "@/app/kurse/_components/typography";
import { BioCourseCta, StickyCourseBar } from "./course-cta";

// Only the known profile slugs render; anything else 404s.
export const dynamicParams = false;

const SITE_URL = "https://ephia.de";

// Single source of truth for every course link on this page — the bottom
// CTA, the two inline bridges and the sticky bar all point here.
const COURSES_HREF = "/unsere-kurse";

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

// Leading academic/professional titles, used both to strip them for the
// first-name CTA and to surface them as the schema `honorificPrefix`.
const TITLE_PREFIX_RE = /^((?:Prof\.|Dr\.|Priv\.-Doz\.|Dipl\.\S*)\s+)+/i;

/** Extract the given name from a display name, stripping leading titles
 *  ("Dr.", "Prof. Dr.", …). Used for the warm, first-name CTA. */
function firstName(name: string): string {
  const withoutTitles = plainName(name).replace(TITLE_PREFIX_RE, "").trim();
  return withoutTitles.split(" ")[0] || plainName(name);
}

/** Split a display name into honorific prefix + given + family name for
 *  richer Person schema. "Dr. Sophia Wilk-Vollmann" →
 *  { honorificPrefix: "Dr.", givenName: "Sophia", familyName: "Wilk-Vollmann" }. */
function splitName(display: string): {
  honorificPrefix?: string;
  givenName?: string;
  familyName?: string;
} {
  const plain = plainName(display).trim();
  const titleMatch = plain.match(TITLE_PREFIX_RE);
  const honorificPrefix = titleMatch ? titleMatch[0].trim() : undefined;
  const rest = (titleMatch ? plain.slice(titleMatch[0].length) : plain).trim();
  const parts = rest.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { honorificPrefix };
  return {
    honorificPrefix,
    givenName: parts[0],
    familyName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
  };
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
  const media = (person.media ?? []).filter((m) => m.url);
  // JSON-LD sameAs gets BOTH the social/professional profiles and the
  // media URLs — every external mention is an EEAT signal — even though
  // the two render in separate visible sections.
  const schemaSameAs = [...sameAs, ...media.map((m) => m.url)];
  const isDozent = /Dozent/.test(person.role);
  const given = firstName(person.name);
  const ctaHeading = isDozent
    ? `Lerne bei ${given} und unserem Team`
    : "Entdecke unsere Kurse";

  // Lead-in for the two inline course bridges. Review-Board members don't
  // teach, so they get a wording that stays factually correct.
  const bridgeIntro = isDozent
    ? `${given} unterrichtet bei EPHIA. Entdecke unsere Kurse für Ärzt:innen und Zahnärzt:innen.`
    : `${given} ist Teil von EPHIA. Entdecke unsere Kurse für Ärzt:innen und Zahnärzt:innen.`;
  const stickyLabel = isDozent
    ? `${given} unterrichtet bei EPHIA`
    : "Kurse für Ärzt:innen und Zahnärzt:innen";

  // Name parts for richer Person markup (honorific + given/family name).
  const { honorificPrefix, givenName, familyName } = splitName(person.name);

  // Person node — the EEAT signal: connects the (real, credentialed)
  // instructor to EPHIA's medical course content. Given a stable @id so other
  // pages/articles can attribute authorship to this exact node via
  // `author: { "@id": … }`.
  const personId = `${profileUrl}#person`;
  const personJsonLd = {
    "@type": "Person",
    "@id": personId,
    name,
    ...(honorificPrefix ? { honorificPrefix } : {}),
    ...(givenName ? { givenName } : {}),
    ...(familyName ? { familyName } : {}),
    url: profileUrl,
    mainEntityOfPage: profileUrl,
    jobTitle: person.role,
    // Explicit Occupation node ("zum Beruf") so Google reads the profession,
    // not just the free-text jobTitle string.
    hasOccupation: {
      "@type": "Occupation",
      name: person.role,
      ...(person.medicalSpecialty
        ? { occupationalCategory: person.medicalSpecialty }
        : {}),
    },
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
    ...(schemaSameAs.length ? { sameAs: schemaSameAs } : {}),
  };

  // Wrap the Person in a ProfilePage — Google's documented profile/author
  // markup. A bare Person node is valid but isn't a Google rich-result type,
  // so the Rich Results Test reports nothing. ProfilePage with the Person as
  // `mainEntity` is what makes the test detect the page and lets Google
  // attribute authorship to the person.
  const profilePageJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": profileUrl,
    url: profileUrl,
    name: `${name}, ${person.role}`,
    ...(person.imagePath ? { image: person.imagePath } : {}),
    mainEntity: personJsonLd,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profilePageJsonLd) }}
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

            <div className="flex flex-col items-start gap-6 md:gap-8">
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
              <div className="w-full min-w-0">
                <h1 className={`${TYPO.h1} text-black`}>{person.name}</h1>
                <p className="mt-2 text-lg md:text-xl font-semibold text-[#0066FF]">
                  {person.role}
                </p>
                {person.curriculum?.tagline && (
                  <p className={`${TYPO.bodyLead} mt-4`}>
                    {person.curriculum.tagline}
                  </p>
                )}
                {(person.bio && person.bio.length > 0
                  ? person.bio
                  : person.shortBio
                    ? [person.shortBio]
                    : []
                ).map((para, i) => (
                  <p key={i} className={`${TYPO.bodyLead} mt-4`}>
                    {para}
                  </p>
                ))}

                {/* Course bridge sits directly under the intro and above
                    everything that could send the visitor off-site. */}
                <BioCourseCta
                  href={COURSES_HREF}
                  intro={bridgeIntro}
                  location="bio-bridge-top"
                  personSlug={person.id}
                  className="mt-8"
                />
              </div>
            </div>
          </div>
        </section>

        {media.length > 0 && (
          <section className="bg-[#FAEBE1] pb-10 md:pb-14">
            <div className="max-w-4xl mx-auto px-5 md:px-8">
              <div className="bg-white rounded-[10px] p-6 md:p-10">
                <h2 className="text-xl md:text-2xl font-bold text-black mb-5 tracking-wide">
                  Podcasts & Interviews
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {media.map((item) => (
                    <MediaRow key={item.url} item={item} />
                  ))}
                </ul>
              </div>

              {/* Second bridge: catches everyone who scrolled the media
                  list instead of clicking the top CTA. */}
              <BioCourseCta
                href={COURSES_HREF}
                intro={bridgeIntro}
                location="bio-bridge-mid"
                personSlug={person.id}
                className="mt-6"
              />
            </div>
          </section>
        )}

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

        {/* "Im Netz" is deliberately demoted to the very end of the
            content and rendered as plain inline text links rather than
            pill buttons: these are outbound links, and up in the hero
            they were ending the session before the visitor ever saw a
            course. The links themselves are unchanged (still
            target="_blank" + rel="noopener noreferrer"), so an accidental
            click no longer costs us the tab. */}
        {sameAs.length > 0 && (
          <section className="bg-[#FAEBE1] pb-10 md:pb-14">
            <div className="max-w-4xl mx-auto px-5 md:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-black/50 mb-2">
                Im Netz
              </p>
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {sameAs.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-black/60 underline underline-offset-4 decoration-black/25 hover:text-[#0066FF] hover:decoration-[#0066FF] transition-colors"
                    >
                      <span>{linkLabel(url)}</span>
                      <ExternalLink
                        className="w-3 h-3 text-black/35"
                        strokeWidth={2.25}
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                ))}
              </ul>
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
                href={COURSES_HREF}
                className="inline-flex items-center justify-center rounded-[10px] bg-[#FAEBE1] text-[#0066FF] font-bold text-base md:text-lg px-7 py-4 hover:bg-white transition-colors"
              >
                Alle Kurse ansehen
              </Link>
            </div>
          </div>
        </section>

        {/* Reserves the height of the fixed sticky bar so it can never
            cover the footer or the bottom CTA. */}
        <div aria-hidden="true" className="h-16 md:h-[68px]" />
      </main>

      <Footer />

      <StickyCourseBar
        href={COURSES_HREF}
        label={stickyLabel}
        personSlug={person.id}
      />
    </div>
  );
}

function MediaRow({ item }: { item: MediaAppearance }) {
  return (
    <li>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-3 rounded-[10px] -mx-3 px-3 py-2.5 hover:bg-[#FAEBE1]/60 transition-colors"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm md:text-base font-semibold text-black/85 group-hover:text-[#0066FF] transition-colors">
            {item.title}
            {item.format && (
              <span className="ml-2 inline-block align-middle rounded-[10px] bg-[#0066FF]/10 px-2 py-0.5 text-xs font-semibold text-[#0066FF]">
                {item.format}
              </span>
            )}
          </span>
          <span className="block text-sm text-black/55">{item.outlet}</span>
        </span>
        <ExternalLink
          className="mt-1 w-3.5 h-3.5 shrink-0 text-black/40"
          strokeWidth={2.25}
          aria-hidden="true"
        />
      </a>
    </li>
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
