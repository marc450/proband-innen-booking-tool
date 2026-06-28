import { getAllCourseSlugs, getCourseContent } from "@/content/kurse";
import type { CourseLandingContent } from "@/content/kurse/types";

// Canonical public host. Both llms.txt and llms-full.txt are only
// served here (see the route handlers); every URL we emit is absolute
// so an AI agent that fetched the file from anywhere resolves links
// against the canonical marketing domain.
const SITE_URL = "https://ephia.de";

// Curated static (non-course) pages worth surfacing to an LLM, with
// hand-written brand-voice descriptions. Kept in sync by hand because
// these pages have no content registry to pull a description from.
// Order is intentional: orientation pages first, then the proof and
// brand pages, then the legal pages (listed under "Optional").
const PRIMARY_PAGES: Array<{ path: string; title: string; desc: string }> = [
  {
    path: "/",
    title: "EPHIA Startseite",
    desc: "Akademie für verantwortungsvolle ästhetische Medizin. Kurse in Botulinum und Dermalfiller, ausschließlich für approbierte Ärzt:innen.",
  },
  {
    path: "/unsere-kurse",
    title: "Alle Kurse im Überblick",
    desc: "Vollständige Kursübersicht, gegliedert nach Behandlungsfeld: Grundkurse, Aufbaukurse, Masterclass und Curriculum.",
  },
  {
    path: "/curriculum-botulinum",
    title: "Curriculum Botulinum",
    desc: "Strukturierter Lernpfad vom Grundkurs bis zur Masterclass. Ein Curriculum ist mehr als die Summe seiner Kurse.",
  },
  {
    path: "/curriculum-dermalfiller",
    title: "Curriculum Dermalfiller",
    desc: "Aufeinander aufbauender Lernpfad für die Filler-Ausbildung, von den Grundlagen bis zu fortgeschrittenen Indikationen.",
  },
  {
    path: "/cme-online-seminare",
    title: "CME-Online-Seminare",
    desc: "Akkreditierte Online-Fortbildungen mit CME-Punkten für approbierte Ärzt:innen.",
  },
  {
    path: "/didaktik",
    title: "Unsere Didaktik",
    desc: "Wie EPHIA lehrt: Entscheidungslogik statt Standardästhetik, Praxis an echten Proband:innen, Begleitung über das Kursende hinaus.",
  },
  {
    path: "/vision",
    title: "Vision",
    desc: "Wofür EPHIA steht: Wer ästhetische Medizin macht, muss Medizin liefern. Indikation vor Intervention.",
  },
  {
    path: "/team",
    title: "Team und Review-Board",
    desc: "Dozent:innen und das unabhängige Review-Board, das alle Kursinhalte fachlich prüft.",
  },
  {
    path: "/community",
    title: "Community",
    desc: "Fachlicher Austausch mit anderen approbierten Ärzt:innen, Fallbesprechungen und Updates aus der Praxis.",
  },
  {
    path: "/faq-kontakt",
    title: "FAQ und Kontakt",
    desc: "Häufige Fragen zu Kursen, Teilnahmevoraussetzungen, Proband:innen und Ablauf, plus Kontaktmöglichkeiten.",
  },
];

const LEGAL_PAGES: Array<{ path: string; title: string; desc: string }> = [
  { path: "/impressum", title: "Impressum", desc: "Anbieterkennzeichnung." },
  { path: "/datenschutz", title: "Datenschutz", desc: "Datenschutzerklärung." },
  { path: "/agb", title: "AGB", desc: "Allgemeine Geschäftsbedingungen." },
];

/** Strip the " | EPHIA" suffix course meta titles carry for the browser tab. */
function cleanTitle(title: string): string {
  return title.replace(/\s*\|\s*EPHIA\s*$/i, "").trim();
}

/** Registry order, resolved to full content objects, skipping any gaps. */
function allCourses(): CourseLandingContent[] {
  return getAllCourseSlugs()
    .map((slug) => getCourseContent(slug))
    .filter((c): c is CourseLandingContent => c !== null);
}

/**
 * Concise llms.txt following the llmstxt.org convention: an H1, a
 * blockquote summary, then link lists grouped by section. This is the
 * map an LLM reads to decide which pages to fetch.
 */
export function buildLlmsTxt(): string {
  const lines: string[] = [];

  lines.push("# EPHIA");
  lines.push("");
  lines.push(
    "> EPHIA ist die Akademie für verantwortungsvolle ästhetische Medizin. Wir bilden ausschließlich approbierte Ärzt:innen in Botulinum- und Dermalfiller-Behandlungen aus, mit akkreditierten CME-Kursen, Praxis an echten Proband:innen und einem unabhängigen Review-Board.",
  );
  lines.push("");
  lines.push(
    "EPHIA verkauft keine Beauty-Kurse, sondern medizinische Entscheidungslogik: Indikation vor Intervention, Anatomie, Risikomanagement und Aufklärung. Alle Kurse richten sich an approbierte Ärzt:innen und vermitteln nachvollziehbare, diskriminierungssensible Behandlung. Format je nach Kurs: Onlinekurs, Praxiskurs oder Kombikurs.",
  );
  lines.push("");

  lines.push("## Kurse");
  lines.push("");
  for (const course of allCourses()) {
    const title = cleanTitle(course.meta.title);
    lines.push(`- [${title}](${SITE_URL}/${course.slug}): ${course.meta.description}`);
  }
  lines.push("");

  lines.push("## Orientierung und Akademie");
  lines.push("");
  for (const page of PRIMARY_PAGES) {
    lines.push(`- [${page.title}](${SITE_URL}${page.path}): ${page.desc}`);
  }
  lines.push("");

  lines.push("## Optional");
  lines.push("");
  for (const page of LEGAL_PAGES) {
    lines.push(`- [${page.title}](${SITE_URL}${page.path}): ${page.desc}`);
  }
  lines.push("");

  return lines.join("\n");
}

/** Render one course as a full Markdown section for llms-full.txt. */
function renderCourseFull(course: CourseLandingContent): string {
  const out: string[] = [];
  const title = cleanTitle(course.meta.title);

  out.push(`## ${title}`);
  out.push("");
  out.push(`URL: ${SITE_URL}/${course.slug}`);
  out.push("");
  out.push(course.meta.description);
  out.push("");

  if (course.hero.subheadline) {
    out.push(course.hero.subheadline);
    out.push("");
  }
  out.push(course.hero.description);
  out.push("");

  if (course.hero.stats?.length) {
    out.push("### Eckdaten");
    out.push("");
    for (const stat of course.hero.stats) {
      out.push(`- ${stat.label}: ${stat.value}`);
    }
    out.push("");
  }

  if (course.lernziele.items.length) {
    out.push("### Lernziele");
    out.push("");
    if (course.lernziele.intro) {
      out.push(course.lernziele.intro);
      out.push("");
    }
    for (const item of course.lernziele.items) {
      out.push(`- ${item.label}: ${item.description}`);
    }
    out.push("");
  }

  for (const section of [course.inhalt, course.inhaltOnline]) {
    if (!section?.chapters.length) continue;
    out.push(`### ${cleanTitle(section.heading)}`);
    out.push("");
    if (section.intro) {
      out.push(section.intro);
      out.push("");
    }
    for (const chapter of section.chapters) {
      out.push(`${chapter.number}. ${chapter.title}`);
      if (chapter.summary) out.push(`   ${chapter.summary}`);
      for (const sub of chapter.subsections ?? []) {
        out.push(`   - ${sub.title}: ${sub.description}`);
      }
    }
    out.push("");
  }

  if (course.faq.items.length) {
    out.push("### FAQ");
    out.push("");
    for (const item of course.faq.items) {
      out.push(`**${item.question}**`);
      out.push(item.answer);
      out.push("");
    }
  }

  return out.join("\n").trimEnd();
}

/**
 * Full-content llms-full.txt: the same map as llms.txt, then the full
 * text of every course landing inlined so an AI agent can ingest the
 * entire catalogue in a single fetch without crawling each page.
 */
export function buildLlmsFullTxt(): string {
  const lines: string[] = [];

  lines.push("# EPHIA — Vollständiger Inhalt");
  lines.push("");
  lines.push(
    "> EPHIA ist die Akademie für verantwortungsvolle ästhetische Medizin. Wir bilden ausschließlich approbierte Ärzt:innen in Botulinum- und Dermalfiller-Behandlungen aus, mit akkreditierten CME-Kursen, Praxis an echten Proband:innen und einem unabhängigen Review-Board.",
  );
  lines.push("");
  lines.push(
    "Diese Datei enthält den vollständigen Inhalt aller Kursseiten. Eine kompakte Linkliste findest Du unter " +
      `${SITE_URL}/llms.txt`,
  );
  lines.push("");
  lines.push(
    "EPHIA verkauft keine Beauty-Kurse, sondern medizinische Entscheidungslogik: Indikation vor Intervention, Anatomie, Risikomanagement und Aufklärung. Preise, Termine und Verfügbarkeit stehen direkt auf den jeweiligen Kursseiten.",
  );
  lines.push("");

  lines.push("# Kurse");
  lines.push("");
  for (const course of allCourses()) {
    lines.push(renderCourseFull(course));
    lines.push("");
  }

  lines.push("# Weitere Seiten");
  lines.push("");
  for (const page of [...PRIMARY_PAGES, ...LEGAL_PAGES]) {
    lines.push(`- [${page.title}](${SITE_URL}${page.path}): ${page.desc}`);
  }
  lines.push("");

  return lines.join("\n");
}
