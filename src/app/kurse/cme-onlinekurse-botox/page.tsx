import type { Metadata } from "next";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { homeContent } from "@/content/kurse/home";
import type { HomeCourseTile } from "@/content/kurse/home-types";
import { Faq } from "../_components/sections/faq";
import { LearningPath } from "../_components/sections/learning-path";
import { CtaBanner } from "../_components/sections/cta-banner";
import { TYPO, titleCase } from "../_components/typography";

export const dynamic = "force-dynamic";

const SITE_URL = "https://kurse.ephia.de";
const PAGE_PATH = "/kurse/cme-onlinekurse-botox";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

const BLUE = "#0066FF";
const CREAM = "#FAEBE1";
const CORAL = "#BF785E";

// Botox-themed performance landing page. Targets searches for "Botox-Kurs",
// "CME Botox", "Botox-Online-Fortbildung". Course list is the same Botulinum
// curriculum (Botox is the brand name; Botulinum is the medical term),
// minus the Zahnmedizin tile because no CME is awarded for that audience.
const BOTULINUM_COURSE_KEYS = new Set([
  "grundkurs_botulinum",
  "aufbaukurs_botulinum_periorale_zone",
  "aufbaukurs_therapeutische_indikationen_botulinum",
  "masterclass_botulinum",
]);

export const metadata: Metadata = {
  title:
    "CME-Online-Kurse Botox für Ärzt:innen | Ärztekammer Berlin | EPHIA",
  description:
    "CME-Online-Kurse Botox für approbierte Ärzt:innen: Grundkurs, Aufbaukurse und Masterclass zur Behandlung mit Botulinum. Akkreditiert von der Ärztekammer Berlin, flexibel im eigenen Tempo.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "CME-Online-Kurse Botox für Ärzt:innen | EPHIA",
    description:
      "CME-Punkte zur Botox-Behandlung online sammeln. Grundkurs, Aufbaukurse und Masterclass. Akkreditiert von der Ärztekammer Berlin.",
    type: "website",
    siteName: "EPHIA",
    locale: "de_DE",
    url: PAGE_URL,
  },
};

const FAQ_ITEMS = [
  {
    question: "Was ist ein CME-Online-Kurs Botox?",
    answer:
      "Ein CME-Online-Kurs Botox (Continuing Medical Education) ist eine ärztliche Online-Fortbildung zur Behandlung mit Botulinumtoxin (umgangssprachlich „Botox\"), für die Du nach erfolgreichem Abschluss Punkte von der Ärztekammer gutgeschrieben bekommst. Bei EPHIA bestehen unsere Botox-Online-Kurse aus dichten Behandlungsvideos, anatomischen Darstellungen, fachlichen Lerntexten und einem abschließenden Lernerfolgstest, den Du in Deinem eigenen Tempo bearbeitest.",
  },
  {
    question: "Wie viele CME-Punkte sammle ich pro EPHIA-Botox-Kurs?",
    answer:
      "Die CME-Punkte variieren je nach Kursumfang. Unsere Botox-Online-Kurse sind aktuell mit jeweils zwischen 10 und 22 CME-Punkten akkreditiert. Die exakte Punktzahl pro Kurs findest Du auf der jeweiligen Kurskarte. Wenn Du den Online-Kurs mit dem dazugehörigen Praxiskurs kombinierst, addieren sich die Punkte beider Akkreditierungen.",
  },
  {
    question: "Welche Akkreditierung haben die EPHIA-Online-Kurse zur Botox-Behandlung?",
    answer:
      "Alle EPHIA-Online-Kurse zur Behandlung mit Botulinumtoxin („Botox\") sind durch die Landesärztekammer Berlin akkreditiert. Jeder Kurs hat eine eigene Veranstaltungsnummer (VNR), die auf Deinem Teilnahmezertifikat ausgewiesen wird. Über diese VNR erfolgt die automatische Übermittlung Deiner Punkte an Dein CME-Konto bei der Ärztekammer.",
  },
  {
    question: "Wie werden CME-Punkte nach Abschluss gutgeschrieben?",
    answer:
      "Nach erfolgreichem Abschluss des Lernerfolgstests gibst Du Deine Einheitliche Fortbildungsnummer (EFN) bei uns an. EPHIA übermittelt die Punkte direkt elektronisch an die Ärztekammer Berlin, die sie automatisch Deinem CME-Konto gutschreibt. Zusätzlich erhältst Du ein digitales Teilnahmezertifikat mit Veranstaltungsnummer (VNR), das Du jederzeit als Nachweis nutzen kannst.",
  },
  {
    question: "Erfüllt ein CME-Online-Kurs Botox meine Fortbildungspflicht?",
    answer:
      "Ja. Approbierte Ärzt:innen müssen nach §95d SGB V innerhalb von fünf Jahren 250 CME-Punkte nachweisen. CME-Online-Kurse zur Behandlung mit Botox zählen vollumfänglich auf diese Pflicht und können flexibel im Praxis- oder Klinikalltag absolviert werden, ohne Reisezeit oder feste Präsenztermine.",
  },
  {
    question: "Ist Vorerfahrung mit Botox erforderlich?",
    answer:
      "Für den Grundkurs ist keine Vorerfahrung mit Botox notwendig. Er richtet sich an approbierte Ärzt:innen, die einen sicheren Einstieg in die Behandlung mit Botulinumtoxin suchen. Die Aufbaukurse setzen Grundkenntnisse voraus, die Masterclass richtet sich an Ärzt:innen, die regelmäßig mit Botox behandeln und ihr Können auf Expert:innen-Niveau heben möchten.",
  },
  {
    question: "Wie lange habe ich Zugriff auf die Botox-Online-Kurse?",
    answer:
      "Du hast 1,5 Jahre Zugriff auf Deine gebuchten Online-Kurse inklusive aller Updates und nachträglich ergänzter Behandlungsvideos. So kannst Du jederzeit Inhalte wiederholen, vor einer Behandlung gezielt nachschlagen oder bei Bedarf Pausen einlegen.",
  },
  {
    question: "Was ist der Unterschied zwischen Botox und Botulinum?",
    answer:
      "„Botox\" ist der bekannteste Markenname (Allergan/AbbVie) für ein Präparat aus Botulinumtoxin Typ A. Im medizinischen Sprachgebrauch ist „Botulinum\" oder „Botulinumtoxin\" der korrekte Wirkstoffname. Inhaltlich behandeln unsere Kurse die Anwendung von Botulinumtoxin in der ästhetischen und therapeutischen Medizin, unabhängig vom Hersteller des verwendeten Präparats.",
  },
];

const LEARNING_PATH = {
  heading: "WIE FUNKTIONIERT EIN CME-ONLINE-KURS BOTOX?",
  steps: [
    {
      number: 1,
      icon: "Zap",
      title: "Buchen und sofort starten",
      description:
        "Wähle den passenden Botox-Kurs und buche bequem online. Nach der Bezahlung erhältst Du sofort Zugang zur Lernplattform, ohne Wartezeit oder Aktivierung.",
    },
    {
      number: 2,
      icon: "Clock",
      title: "Im eigenen Tempo lernen",
      description:
        "Studiere Behandlungsvideos zu jeder Zone, anatomische Darstellungen und kompakte Fachtexte, wann und wo es Dir passt. 1,5 Jahre Zugriff inklusive aller Updates.",
    },
    {
      number: 3,
      icon: "Award",
      title: "Test und CME-Gutschrift",
      description:
        "Am Ende absolvierst Du einen Lernerfolgstest. Bei Bestehen erhältst Du Dein Zertifikat und Deine Punkte werden direkt an die Ärztekammer übermittelt.",
    },
  ],
};

interface TemplateRow {
  course_key: string;
  title: string | null;
  image_url: string | null;
  audience: string | null;
  level: string | null;
  card_description: string | null;
  cme_online: string | null;
  cme_praxis: string | null;
  cme_kombi: string | null;
}

interface TileWithCme {
  tile: HomeCourseTile;
  template: TemplateRow | null;
  cmePoints: number | null;
  cmeLabel: string;
}

function parseCmeNumber(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = String(raw).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function resolveCme(tpl: TemplateRow | null): {
  points: number | null;
  label: string;
} {
  if (!tpl) return { points: null, label: "CME beantragt" };
  const kombi = parseCmeNumber(tpl.cme_kombi);
  const online = parseCmeNumber(tpl.cme_online);
  const praxis = parseCmeNumber(tpl.cme_praxis);

  if (kombi != null) return { points: kombi, label: `${kombi} CME-Punkte` };
  if (online != null && praxis != null) {
    const sum = online + praxis;
    return { points: sum, label: `${sum} CME-Punkte` };
  }
  if (online != null) return { points: online, label: `${online} CME-Punkte` };
  if (praxis != null) return { points: praxis, label: `${praxis} CME-Punkte` };
  return { points: null, label: "CME beantragt" };
}

export default async function CmeOnlinekurseBotoxPage() {
  const supabase = createAdminClient();

  // Pull all home tiles and filter to Botulinum-only courseKeys.
  const sourceTiles = homeContent.courses.tiles.filter(
    (t) =>
      t.type !== "group-inquiry" &&
      t.courseKey &&
      BOTULINUM_COURSE_KEYS.has(t.courseKey),
  );
  const courseKeys = sourceTiles
    .map((t) => t.courseKey)
    .filter((k): k is string => Boolean(k));

  const { data: rows } = await supabase
    .from("course_templates")
    .select(
      "course_key, title, image_url, audience, level, card_description, cme_online, cme_praxis, cme_kombi",
    )
    .in("course_key", courseKeys);

  const templateMap = new Map<string, TemplateRow>();
  for (const r of rows ?? []) {
    templateMap.set(r.course_key as string, {
      course_key: r.course_key as string,
      title: (r.title as string | null) ?? null,
      image_url: (r.image_url as string | null) ?? null,
      audience: (r.audience as string | null) ?? null,
      level: (r.level as string | null) ?? null,
      card_description: (r.card_description as string | null) ?? null,
      cme_online: (r.cme_online as string | null) ?? null,
      cme_praxis: (r.cme_praxis as string | null) ?? null,
      cme_kombi: (r.cme_kombi as string | null) ?? null,
    });
  }

  const tilesWithCme: TileWithCme[] = sourceTiles.map((tile) => {
    const tpl = tile.courseKey ? templateMap.get(tile.courseKey) ?? null : null;
    const { points, label } = resolveCme(tpl);
    return { tile, template: tpl, cmePoints: points, cmeLabel: label };
  });

  const totalCme = tilesWithCme.reduce(
    (sum, t) => sum + (t.cmePoints ?? 0),
    0,
  );

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "CME-Online-Kurse Botox für approbierte Ärzt:innen",
    description:
      "Übersicht aller CME-akkreditierten Online-Kurse zur Behandlung mit Botulinumtoxin (Botox) von EPHIA.",
    url: PAGE_URL,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: tilesWithCme.length,
      itemListElement: tilesWithCme.map((entry, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        item: {
          "@type": "Course",
          name:
            entry.template?.title ||
            `${titleCase(entry.tile.kicker)} ${titleCase(entry.tile.title)}`,
          description: entry.tile.description,
          url: entry.tile.href
            ? entry.tile.href.startsWith("http")
              ? entry.tile.href
              : `https://ephia.de${entry.tile.href}`
            : PAGE_URL,
          provider: {
            "@type": "Organization",
            name: "EPHIA",
            url: "https://ephia.de",
          },
          ...(entry.cmePoints != null
            ? {
                educationalCredentialAwarded: `${entry.cmePoints} CME-Punkte (Ärztekammer Berlin)`,
              }
            : {}),
        },
      })),
    },
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
        name: "CME-Online-Kurse Botox",
        item: PAGE_URL,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
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
            CME-Online-Kurse Botox
            <br />
            für approbierte Ärzt:innen
          </h1>
          <p className="text-base md:text-[17px] leading-relaxed text-black/75 max-w-2xl mx-auto mb-10">
            Über{" "}
            <strong className="font-bold text-black">
              {totalCme} CME-Punkte
            </strong>{" "}
            zur Behandlung mit Botox (Botulinumtoxin) online sammeln, akkreditiert von der Ärztekammer Berlin.
          </p>

          <a
            href="#kurse"
            className="inline-block text-base md:text-lg font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-7 py-4 transition-colors"
          >
            Zu den Kursen ↓
          </a>
        </div>
      </section>

      <LearningPath content={LEARNING_PATH} />

      <section
        id="kurse"
        className="py-16 md:py-24 scroll-mt-24 md:scroll-mt-28"
        style={{ backgroundColor: CREAM }}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h2 className={`${TYPO.h2} mb-5`}>Unsere CME-akkreditierten Botox-Kurse</h2>
            <p className={TYPO.bodyLead}>
              Vom Grundkurs bis zur Masterclass. Klicke auf eine Kurskarte für die vollständigen Inhalte, Behandlungsvideos und Termine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
            {tilesWithCme.map((entry, i) => (
              <CmeCourseTile key={`${entry.tile.courseKey}-${i}`} entry={entry} />
            ))}
          </div>
        </div>
      </section>

      <Faq content={{ heading: "FAQ zu CME-Online-Kursen Botox", items: FAQ_ITEMS }} />

      <CtaBanner
        content={{
          heading: "Bereit für Deine nächsten CME-Punkte mit Botox?",
          ctaLabel: "Jetzt Kurs wählen",
          ctaHref: "#kurse",
        }}
      />
    </>
  );
}

function CmeCourseTile({ entry }: { entry: TileWithCme }) {
  const { tile, template, cmeLabel, cmePoints } = entry;
  const isExternal = tile.href?.startsWith("http");

  const fullTitle = template?.title
    ? template.title
    : tile.kicker
    ? `${titleCase(tile.kicker)} ${titleCase(tile.title)}`
    : titleCase(tile.title);

  const audienceValue =
    template?.audience ??
    (tile.courseKey?.includes("zahnmedizin") ? "zahnmediziner" : "humanmediziner");

  const audiencePill =
    audienceValue === "alle"
      ? null
      : audienceValue === "zahnmediziner"
      ? { label: "Für Zahnmediziner:innen", bg: CORAL, text: "#FFFFFF" }
      : { label: "Für Humanmediziner:innen", bg: BLUE, text: "#FFFFFF" };

  const levelValue =
    template?.level === "einsteiger" || template?.level === "fortgeschritten"
      ? template.level
      : tile.kicker?.toUpperCase() === "GRUNDKURS"
      ? "einsteiger"
      : tile.kicker?.toUpperCase() === "AUFBAUKURS"
      ? "fortgeschritten"
      : null;
  const levelLabel =
    levelValue === "einsteiger"
      ? "Für Einsteiger:innen"
      : levelValue === "fortgeschritten"
      ? "Für Fortgeschrittene"
      : null;

  const imagePath = template?.image_url || tile.imagePath;
  const description = template?.card_description || tile.description;
  const cmePending = cmePoints == null;

  return (
    <article className="bg-white rounded-[10px] overflow-hidden flex flex-col group">
      {imagePath && (
        <div className="relative aspect-[4/3] bg-black/5 overflow-hidden">
          <Image
            src={imagePath}
            alt={tile.imageAlt ?? `${fullTitle}, CME-Online-Kurs Botox`}
            fill
            quality={85}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      )}

      <div className="flex flex-col flex-1 p-6 md:p-8">
        <h3 className="text-xl md:text-2xl font-bold tracking-wide leading-tight text-black text-balance">
          {fullTitle}
        </h3>

        <div className="flex flex-wrap items-center gap-1.5 mt-4">
          {audiencePill && (
            <span
              className="text-[11px] font-semibold tracking-wide rounded-full px-2.5 py-1"
              style={{ backgroundColor: audiencePill.bg, color: audiencePill.text }}
            >
              {audiencePill.label}
            </span>
          )}
          {levelLabel && (
            <span className="text-[11px] font-semibold tracking-wide rounded-full px-2.5 py-1 bg-black/5 text-black/70">
              {levelLabel}
            </span>
          )}
          <span
            className={`text-[11px] font-semibold tracking-wide rounded-full px-2.5 py-1 ${
              cmePending ? "bg-black/5 text-black/70" : "bg-[#0066FF]/10 text-[#0066FF]"
            }`}
          >
            {cmeLabel}
          </span>
        </div>

        <p className={`${TYPO.bodyCard} mt-4 mb-6 flex-1`}>{description}</p>

        {tile.href && (
          <a
            href={tile.href}
            {...(isExternal
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="block text-center w-full text-sm md:text-base font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-5 py-3 transition-colors"
          >
            Zur Kursseite →
          </a>
        )}
      </div>
    </article>
  );
}
