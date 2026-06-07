// CME-Fallbeispiele content registry.
//
// Each entry is one peer-reviewed, CME-oriented clinical case study,
// rendered by src/app/kurse/cme-fallbeispiele/[caseSlug]/page.tsx and
// listed on the hub at src/app/kurse/cme-fallbeispiele/page.tsx.
//
// PUBLISHING RULE: a case study only goes live (listed on the hub +
// indexable + JSON-LD emitted) when `published: true`. Until then the
// spoke renders for local review but is noindex and unlinked. NEVER set
// published: true while the body is still placeholder text or while the
// author is not a real, credentialed Dozent:in — this is public YMYL
// medical content.

export interface CaseStudySection {
  heading: string;
  /** Body paragraphs for this section. */
  paragraphs?: string[];
  /** Optional bullet list rendered under the paragraphs. */
  bullets?: string[];
  /** Optional paragraphs rendered AFTER the bullet list (e.g. a closing
   *  note that has to sit below the list). */
  afterBullets?: string[];
}

export interface CaseStudyFaq {
  question: string;
  answer: string;
}

export interface CaseStudyAuthor {
  /** Full name incl. academic title, e.g. "Dr. med. Sophia Wilk-Vollmann". */
  name: string;
  /** Role/credential line for the E-E-A-T author box. */
  role: string;
}

export type CaseStudyType = "Komplikation" | "Behandlung" | "Indikation";

export interface CaseStudy {
  slug: string;
  /** Gate for going live. See PUBLISHING RULE above. */
  published: boolean;
  type: CaseStudyType;
  /** H1 + hub card title. */
  title: string;
  /** <title> tag content; the " | EPHIA" suffix is appended centrally. */
  metaTitle: string;
  metaDescription: string;
  /** One-line teaser for the hub card. */
  teaser: string;
  /** Lead paragraph(s) under the H1. */
  lead: string[];
  /** ISO dates for schema datePublished / dateModified. */
  publishedIso: string;
  updatedIso: string;
  author: CaseStudyAuthor;
  /** CME learning objective, shown in a callout near the top. */
  cmeObjective: string;
  /** Internal link down to the matching course landing page. Use the
   *  internal /kurse/<slug> href (the middleware serves the clean URL).
   *  `intro` is the lead-in sentence shown above the CTA button. */
  course: { label: string; href: string; intro?: string };
  /** Clinical body following the CME case-study template. */
  sections: CaseStudySection[];
  faq: CaseStudyFaq[];
  /** Reference list (Leitlinien, Studien). Shown verbatim. */
  sources: string[];
  /** slugs of related case studies for cross-linking. */
  relatedSlugs?: string[];
}

// ─────────────────────────────────────────────────────────────────────
// Tier 1 spoke. Reclaims the (now 301'd) /blog/erysipel-nach-skinbooster
// ranking. Body is PLACEHOLDER until Marc supplies the LearnWorlds text.
// ─────────────────────────────────────────────────────────────────────
const erysipelNachSkinbooster: CaseStudy = {
  slug: "erysipel-nach-skinbooster",
  published: true,
  type: "Komplikation",
  title: "Erysipel nach Skinbooster: erkennen, abgrenzen, behandeln",
  metaTitle: "Erysipel nach Skinbooster: Diagnose und Therapie",
  metaDescription:
    "CME-Fallbeispiel: Wie Du ein Erysipel im Gesicht nach Skinbooster oder Filler erkennst, von einer banalen Rötung abgrenzt und leitlinienorientiert behandelst, auch bei Penicillinallergie.",
  teaser:
    "Wie Du eine infektiöse Komplikation nach Injektion sicher von einer banalen Reaktion abgrenzt und leitlinienorientiert behandelst.",
  lead: [
    "Dein Patient kommt zwei Tage nach einer Skinboosterbehandlung mit geröteter, überwärmter Wange in die Praxis zurück. Kein Fieber, aber zunehmender Schmerz. Im ersten Moment wirkt es wie ein lokales Hämatom, im zweiten zeigt sich: Es ist mehr.",
    "In diesem Beitrag analysieren wir einen dokumentierten Fall aus der Praxis: Ein Patient entwickelt nach einer Skinboosterbehandlung ein Erysipel. Wir schauen auf Verlauf, klinische Einschätzung und therapeutisches Vorgehen, und was wir aus dem Fall gelernt haben.",
    "Komplikationen sind kein Ausnahmefall. Sie erfordern denselben Anspruch wie jede medizinische Entscheidung: klare Einschätzung, sichere Handlung, aufmerksame Nachsorge.",
  ],
  publishedIso: "2026-06-07",
  updatedIso: "2026-06-07",
  author: {
    name: "Dr. Sophia Wilk-Vollmann",
    role: "Ärztin und Dozentin, EPHIA",
  },
  cmeObjective:
    "Nach diesem Fallbeispiel kannst Du ein beginnendes Erysipel nach Injektionsbehandlung im Gesicht klinisch erkennen, es von einer banalen postprozeduralen Reaktion abgrenzen, eine individualisierte antiinfektive Therapie einleiten (inklusive Vorgehen bei Penicillinallergie) und die Kriterien für eine stationäre Vorstellung anwenden.",
  course: {
    label: "Grundkurs Dermalfiller",
    href: "/kurse/grundkurs-dermalfiller",
    intro:
      "In unserem Grundkurs Dermalfiller vermitteln wir umfassendes Wissen über den sicheren Umgang mit Dermalfillern, einschließlich der Erkennung und Behandlung von Komplikationen. Du lernst, wie Du Risiken minimierst und im Ernstfall richtig reagierst.",
  },
  sections: [
    {
      heading: "Wie es dazu kam",
      paragraphs: [
        "Der Patient stellte sich in unserer Praxis zur Skinbooster-Behandlung der unteren Gesichtshälfte vor. Die Indikation wurde nach ausführlicher Anamnese, Beratung und Gesichtsanalyse gestellt. Es bestanden keine relevanten Vorerkrankungen oder Dauermedikation. Eine vergleichbare Behandlung war bereits in der Vergangenheit komplikationslos erfolgt.",
        "Die Behandlung wurde unter Einhaltung aller hygienischen Standards durchgeführt. Nach mehrfacher Desinfektion des Areals erfolgte die Applikation mittels spitzer Technik mit 31G Nadel. Es zeigten sich keine unmittelbaren Auffälligkeiten oder Unverträglichkeiten.",
        "Am dritten Tag nach der Behandlung meldete sich der Patient mit einer zunehmenden einseitigen Rötung im Bereich der linken Wange. Das klinische Bild sprach für ein beginnendes Erysipel. Systemische Symptome bestanden zu diesem Zeitpunkt nicht. Aufgrund fehlender Penicillinallergie wurde umgehend eine antiinfektive Therapie mit Penicillin eingeleitet. Die Rötung bildete sich innerhalb kurzer Zeit unter der antibiotischen Behandlung deutlich zurück, sodass eine ambulante Weiterbehandlung möglich war. Eine stationäre Vorstellung wurde erwogen, letztlich aber nicht notwendig, insbesondere da keine Allgemeinsymptome oder Ausweitung des Prozesses auftraten.",
        "Im weiteren Verlauf berichtete der Patient von bereits bekannten wiederkehrenden Hautveränderungen, die bereits dermatologisch abgeklärt worden waren. Ein konkreter immunologischer oder systemischer Hintergrund ließ sich nicht sichern, jedoch wurde eine generelle Barrierestörung der Haut diskutiert.",
      ],
    },
    {
      heading: "Was ist ein Erysipel?",
      paragraphs: [
        "Ein Erysipel, auch bekannt als Wundrose, ist eine akute bakterielle Infektion der oberen Hautschichten, verursacht meist durch β-hämolysierende Streptokokken Gruppe A.",
        "Klinische Merkmale:",
      ],
      bullets: [
        "Flächenhafte, scharf begrenzte Rötung der Haut",
        "Überwärmung und Schmerzen im betroffenen Areal",
        "Fieber und allgemeines Krankheitsgefühl",
        "Schwellung der regionalen Lymphknoten",
      ],
    },
    {
      heading: "Allgemeine Therapieoptionen",
      paragraphs: [
        "Die antiinfektive Therapie des Erysipels erfolgt leitlinienbasiert in Abhängigkeit vom Schweregrad, der Lokalisation und bestehenden Vorerkrankungen. Ziel ist es, β-hämolysierende Streptokokken als häufigste Erreger zuverlässig zu erfassen.",
        "In unkomplizierten Fällen ohne systemische Zeichen kann eine orale Behandlung ausreichend sein, während in schweren oder ausgedehnten Verläufen eine parenterale Initialtherapie empfohlen wird. Mittel der ersten Wahl sind Penicilline.",
        "Je nach Schwere und Verlauf können sie oral oder parenteral verabreicht werden. Im Fall einer Allergie gegen Penicilline wird Clindamycin als erste Wahl empfohlen.",
        "Die Therapiedauer beträgt in der Regel 5 bis 10 Tage, je nach klinischem Verlauf. Zusätzlich sollte eine symptomatische Therapie erfolgen, z. B. mit Kühlung, Hochlagerung und Schmerzreduktion. Lokale Antiseptika oder chirurgische Maßnahmen sind beim Erysipel selten indiziert, können aber im Verlauf bei sekundärer Abszedierung erforderlich werden.",
        "Wichtiger Hinweis: Dieser Fallbericht mit Therapieoptionen dient ausschließlich der Falldarstellung und soll Deine Aufmerksamkeit hinsichtlich Diagnostik und Therapie schärfen. Eine individuelle Therapieentscheidung muss immer auf Basis der aktuellen Anamnese, klinischen Befunde, lokaler Resistenzlage sowie nach sorgfältiger ärztlicher Abwägung erfolgen. Bitte beachte, dass die zitierte Leitlinie abgelaufen ist. Wie bei jeder antiinfektiven Therapie empfehlen wir die Auswahl der Medikamente anhand des Patient:innenzustandes, der hausinternen Antibiotic-Stewardship-Empfehlungen und Resistenzlagen.",
      ],
    },
    {
      heading: "Wann ist eine stationäre Aufnahme erforderlich?",
      paragraphs: [
        "In bestimmten Fällen sollte bei einem Erysipel eine stationäre Aufnahme erwogen werden, insbesondere, wenn der Verlauf kompliziert oder Risikofaktoren vorliegen. Dazu gehören:",
      ],
      bullets: [
        "Reduzierter Allgemeinzustand oder das Vorliegen systemischer Symptome (z. B. Fieber, Schüttelfrost)",
        "Bekannte oder vermutete Immunsuppression (z. B. bei Diabetes mellitus, Tumorerkrankungen, systemischer Medikation)",
        "Ausbreitung der Infektion trotz adäquater antiinfektiver Therapie",
        "Beteiligung sensibler Regionen, insbesondere im Gesicht, hier sollte bereits frühzeitig eine stationäre Überwachung erfolgen, insbesondere bei periorbitaler Lokalisation",
        "Unklare systemische Zeichen oder fehlende Besserung nach 48 Stunden ambulanter Behandlung",
      ],
      afterBullets: [
        "Gerade im Gesichtsbereich kann ein Erysipel rasch fortschreiten und Komplikationen wie eine orbitale Ausbreitung oder eine Sinusvenenthrombose nach sich ziehen. Daher ist hier eine engmaschige Überwachung und ggf. frühzeitige stationäre Vorstellung indiziert.",
        "Hinweis: Die endgültige Entscheidung zur stationären Aufnahme erfolgt individuell und orientiert sich am klinischen Verlauf, an Komorbiditäten sowie an der Einschätzung durch Dich als behandelnde Ärztin bzw. behandelnden Arzt.",
      ],
    },
    {
      heading: "Was ich daraus gelernt habe",
      paragraphs: [
        "Auch bei korrekt durchgeführten Behandlungen und gesunden Ausgangsbedingungen kann es zu infektiösen Komplikationen kommen. Gerade beim Auftreten von unspezifischen oder systemisch unklaren Hautreaktionen in der Vorgeschichte sollten Hinweise auf eine gestörte Hautbarriere oder subklinische Immunsuppression ernst genommen werden.",
        "Komplikationen wie ein Erysipel nach ästhetischen Behandlungen sind selten, aber ernst zu nehmen. Eine frühzeitige Diagnose und Therapie sind entscheidend für den Behandlungserfolg und die Vermeidung schwerwiegender Folgen.",
        "Tipp aus der Praxis: Nach der Behandlung ist auf eine sorgfältige Nachsorge zu achten. Das schließt den Verzicht auf Make-up unmittelbar nach der Injektion, das Meiden von Berührungen im Behandlungsareal und das Einhalten der hygienischen Empfehlungen mit ein. Bitte wiederhole diese Hinweise im Aufklärungsgespräch explizit und gib sie schriftlich Deinen Patient:innen mit.",
      ],
    },
  ],
  faq: [
    {
      question:
        "Wie unterscheide ich ein Erysipel von einer banalen Rötung nach Skinbooster?",
      answer:
        "Für ein Erysipel sprechen eine flächenhafte, scharf begrenzte Rötung, Überwärmung und Schmerzen im Areal sowie ggf. Fieber, allgemeines Krankheitsgefühl und geschwollene regionale Lymphknoten. Eine banale postprozedurale Rötung oder ein Hämatom bleibt lokal begrenzt und ist rückläufig. Bei zunehmender, scharf begrenzter Rötung mit Überwärmung solltest Du an ein beginnendes Erysipel denken.",
    },
    {
      question:
        "Welche Antibiotika kommen beim Erysipel im Gesicht infrage, auch bei Penicillinallergie?",
      answer:
        "Mittel der ersten Wahl sind Penicilline, bei Penicillinallergie wird Clindamycin als erste Wahl empfohlen. Die Therapiedauer beträgt in der Regel 5 bis 10 Tage. Die konkrete Auswahl richtet sich nach Patient:innenzustand, lokaler Resistenzlage und den hausinternen Antibiotic-Stewardship-Empfehlungen.",
    },
    {
      question: "Ab wann ist eine stationäre Aufnahme erforderlich?",
      answer:
        "Erwäge eine stationäre Aufnahme bei reduziertem Allgemeinzustand oder systemischen Symptomen, bei bekannter oder vermuteter Immunsuppression, bei Ausbreitung trotz adäquater Therapie, bei Beteiligung sensibler Regionen wie dem Gesicht (insbesondere periorbital) sowie bei fehlender Besserung nach 48 Stunden ambulanter Behandlung.",
    },
  ],
  sources: [
    "Therapieempfehlungen orientieren sich an den zum Behandlungszeitpunkt gültigen Leitlinien zu Haut- und Weichgewebeinfektionen sowie an hausinternen Antibiotic-Stewardship-Empfehlungen und der lokalen Resistenzlage. Die im Originalbeitrag zitierte Leitlinie ist zwischenzeitlich abgelaufen.",
  ],
};

const CASE_STUDIES: CaseStudy[] = [erysipelNachSkinbooster];

export function getAllCaseStudies(): CaseStudy[] {
  return CASE_STUDIES;
}

export function getPublishedCaseStudies(): CaseStudy[] {
  return CASE_STUDIES.filter((c) => c.published);
}

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((c) => c.slug === slug);
}

export function getAllCaseSlugs(): string[] {
  return CASE_STUDIES.map((c) => c.slug);
}

// Roadmap shown on the hub as "In Vorbereitung". Titles only (no medical
// claims), so it's safe to display before the spokes exist. Move an entry
// into CASE_STUDIES (published) as each one is written.
export const UPCOMING_CASE_STUDIES: { title: string; type: CaseStudyType }[] = [
  { title: "Botulinumtoxin bei Bruxismus und Masseterhypertrophie", type: "Indikation" },
  { title: "Glabella: Anatomie, Ptosis-Risiko und sichere Technik", type: "Behandlung" },
  { title: "Gefäßverschluss nach Filler und Hyaluronidase-Notfallmanagement", type: "Komplikation" },
  { title: "Visusverlust-Risiko bei Gesichtsinjektionen", type: "Komplikation" },
];
