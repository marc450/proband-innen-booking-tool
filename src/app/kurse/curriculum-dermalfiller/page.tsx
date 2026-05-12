import type { Metadata } from "next";
import { Check } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { CURRICULUM_DERMALFILLER } from "@/lib/curricula";
import { TYPO } from "../_components/typography";
import { Lernziele } from "../_components/sections/lernziele";
import { Lernpfad, type LernpfadStep, type LernpfadLernziel } from "../_components/sections/lernpfad";
import { Faq } from "../_components/sections/faq";
import { CtaBanner } from "../_components/sections/cta-banner";
import { Testimonials } from "../_components/sections/testimonials";
import { grundkursDermalfiller } from "@/content/kurse/grundkurs-dermalfiller";
import { grundkursMedizinischeHautpflege } from "@/content/kurse/grundkurs-medizinische-hautpflege";
import { aufbaukursLippen } from "@/content/kurse/aufbaukurs-lippen";
import { aufbaukursBiostimulationSkinbooster } from "@/content/kurse/aufbaukurs-biostimulation-skinbooster";

// Map each curriculum step's courseKey to the per-course content file
// so the curriculum cards can pull the canonical Lernziele list without
// duplicating it. If a course's content is reorganised, the curriculum
// page follows automatically.
const COURSE_CONTENT_BY_KEY = {
  grundkurs_dermalfiller: grundkursDermalfiller,
  grundkurs_medizinische_hautpflege: grundkursMedizinischeHautpflege,
  aufbaukurs_lippen: aufbaukursLippen,
  aufbaukurs_skulptra: aufbaukursBiostimulationSkinbooster,
} as const;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Curriculum Dermalfiller | EPHIA",
  description:
    "Dein strukturierter Weg zur Spezialisierung in der Dermalfiller-Therapie. Vier aufeinander aufbauende Kurse vom Einstieg bis zur Biostimulation, plus die Möglichkeit zur EPHIA Dermalfiller Specialist Zertifizierung.",
  alternates: {
    canonical: "https://ephia.de/curriculum-dermalfiller",
  },
};

/* -------------------------------------------------------------------------- */
/*  Static curriculum content                                                 */
/* -------------------------------------------------------------------------- */

const HERO = {
  heading: "CURRICULUM DERMALFILLER",
  description:
    "Unser Kursangebot ist umfangreich. Das Curriculum hilft Dir, Dich zu orientieren und systematisch zu lernen, statt Kurse zufällig aneinanderzureihen.",
};

const PERSONAS = {
  heading: "FÜR WEN IST DAS CURRICULUM?",
  intro:
    "Drei typische Ausgangspunkte. Egal, wo Du gerade stehst, das Curriculum führt Dich Schritt für Schritt weiter.",
  hideAudienceLabel: true,
  items: [
    {
      icon: "Sparkles",
      label: "Du steigst gerade ein",
      description:
        "Du bist Ärzt:in und willst einen sicheren, leitliniengerechten Einstieg in die Dermalfiller-Therapie. Der Grundkurs gibt Dir das Fundament, der Rest des Curriculums baut Schritt für Schritt darauf auf.",
    },
    {
      icon: "Target",
      label: "Du willst systematisch aufbauen",
      description:
        "Du hast bereits erste Erfahrungen mit Dermalfillern und möchtest Dein Wissen strukturiert erweitern. Periorale Zone, Lippen und Biostimulation öffnen Dir neue Behandlungsfelder mit medizinischem Fokus.",
    },
    {
      icon: "GraduationCap",
      label: "Du willst zur Spezialisierung",
      description:
        "Du behandelst schon länger und suchst Feinschliff: vertiefte Anatomie, spezifische Indikationen und souveränes Komplikationsmanagement. Das Curriculum führt Dich strukturiert dorthin.",
    },
  ],
};

const OUTCOMES = [
  "Du führst Dermalfiller-Behandlungen sicher, anatomisch fundiert und leitliniengerecht durch.",
  "Du erkennst Kontraindikationen und berätst Deine Patient:innen professionell und diskriminierungssensibel.",
  "Du behandelst die periorale Zone und die Lippen mit spezifischen Techniken und klarer Indikationslogik.",
  "Du integrierst medizinische Hautpflege in Deine Behandlungskonzepte und berätst ganzheitlich.",
  "Du beherrschst Biostimulation und Skinbooster zur Verbesserung von Hautqualität, Spannkraft und Volumen.",
  "Du gehst souverän mit Komplikationen um und hast klare Strategien für den Ernstfall.",
];

const FORMAT = {
  heading: "DEIN LERNFORMAT",
  intro:
    "Online-Theorie in Deinem Tempo, Praxis an echten Proband:innen, kleine Gruppen und ein Team, das Dich auch nach dem Kurs begleitet.",
  hideAudienceLabel: true,
  items: [
    {
      icon: "BookOpen",
      label: "Online im eigenen Tempo",
      description:
        "Alle Theorie-Kapitel in praxisnahen Videos und Lernmodulen. Du lernst, wann und wo es Dir passt. 1,5 Jahre Zugriff inkl. Updates.",
    },
    {
      icon: "Syringe",
      label: "Praxis an echten Proband:innen",
      description:
        "In den Kombikursen behandelst Du echte Proband:innen unter Aufsicht erfahrener Dozent:innen. Keine Phantommodelle, sondern der echte Fall.",
    },
    {
      icon: "Users",
      label: "Kleine Gruppen",
      description:
        "Maximal 7 Teilnehmer:innen pro Praxiskurs. Dadurch bleibt genug Zeit für individuelles Feedback und Deine Fragen.",
    },
    {
      icon: "MapPin",
      label: "Standort Berlin-Mitte",
      description:
        "Alle Praxiskurse finden in unseren Räumen in Berlin-Mitte statt. Gut erreichbar mit Bahn und Flugzeug.",
    },
    {
      icon: "Clock",
      label: "Flexible Abfolge",
      description:
        "Du bestimmst, in welchem Tempo Du das Curriculum durchläufst. Die Online-Teile sind sofort verfügbar, die Praxiskurse buchst Du je nach Deinem Kalender.",
    },
    {
      icon: "ShieldCheck",
      label: "Dozent:innen-Support",
      description:
        "Auch nach dem Kurs bleiben Dir unsere Dozent:innen über die Community erhalten. Stell Fragen, tausche Dich aus, bleib am Ball.",
    },
  ],
};

const FAQS = [
  {
    question:
      "Muss ich die Kurse in einer bestimmten Reihenfolge absolvieren?",
    answer:
      "Wir empfehlen die Reihenfolge Grundkurs Dermalfiller, Medizinische Hautpflege, Aufbaukurs Lippen und Aufbaukurs Biostimulation & Skinbooster, weil die Inhalte aufeinander aufbauen. Du kannst die Online-Teile parallel laufen lassen und die Praxiskurse flexibel im Rahmen der verfügbaren Termine buchen.",
  },
  {
    question: "Muss ich alle vier Kurse buchen?",
    answer:
      "Nein. Jeder Kurs ist einzeln buchbar und für sich abgeschlossen. Das Curriculum ist eine Empfehlung, kein Komplettpaket. Du bestimmst, wie weit Du gehst.",
  },
  {
    question: "Wie lange habe ich Zeit, alle 4 Kurse zu absolvieren?",
    answer:
      "Du hast 1,5 Jahre Zugriff auf die Online-Inhalte inklusive Updates. Die Praxiskurse solltest Du innerhalb dieses Zeitraums wahrnehmen. Das reicht auch bei vollem Praxisalltag gut aus.",
  },
  {
    question: "Bekomme ich eine Zertifizierung für das gesamte Curriculum?",
    answer:
      "Ja. Wenn Du alle vier Kurse erfolgreich abgeschlossen hast, erhältst Du das EPHIA Dermalfiller Specialist Zertifikat, ergänzend zu den Einzelzertifikaten der jeweiligen Kurse.",
  },
  {
    question: "Kann ich Termine später verschieben?",
    answer:
      "Ja, Du kannst Praxiskurs-Termine nach Absprache verschieben, solange noch Plätze in anderen Gruppen verfügbar sind. Schreib uns einfach eine Mail an customerlove@ephia.de.",
  },
  {
    question: "Ist Ratenzahlung möglich?",
    answer:
      "Ja, Du kannst bei der Bezahlung Klarna wählen und in Raten zahlen. Das gilt für jeden Kurs einzeln.",
  },
  {
    question: "Bekomme ich eine Rechnung auf meine Praxis?",
    answer:
      "Ja, Du erhältst automatisch eine ordnungsgemäße Rechnung mit Deinen im Checkout eingegebenen Praxisdaten. Diese kannst Du als Fortbildung steuerlich geltend machen.",
  },
  {
    question: "Erhalte ich CME-Punkte?",
    answer:
      "Ja, jeder akkreditierte Kurs im Curriculum bringt CME-Punkte. Die genaue Anzahl siehst Du auf der jeweiligen Kurskarte. Aktuell sind Grundkurs Dermalfiller und Medizinische Hautpflege akkreditiert; die CME-Punkte für Aufbaukurs Lippen und Aufbaukurs Biostimulation & Skinbooster sind bei der LÄK Berlin beantragt.",
  },
  {
    question: "Was, wenn ich einen Praxistermin verpassen muss?",
    answer:
      "Kein Stress. Melde Dich rechtzeitig bei uns, wir finden einen Ersatztermin in einer der nächsten Gruppen.",
  },
  {
    question: "Für wen ist das Curriculum geeignet?",
    answer:
      "Das Curriculum richtet sich an approbierte Ärzt:innen, die in die Dermalfiller-Therapie einsteigen oder ihre bestehenden Kenntnisse systematisch vertiefen wollen. Weitere Voraussetzungen gibt es nicht.",
  },
];

// Reuse the existing Grundkurs Botulinum testimonials until dedicated
// Dermalfiller testimonials are produced. The quotes speak to didactic
// approach and clinical depth, not to a specific substance, so they
// carry across cleanly.
const TESTIMONIALS = {
  heading: "#wearetogether",
  subheading: "Was Ärzt:innen aus dem Curriculum sagen",
  items: [
    {
      quote:
        "Der Grundkurs war der erste Kurs der Dr. Sophia Academy, den ich besucht habe und er hat mich sehr überzeugt! Besonders gut fand ich die praktischen Übungen an Proband:innen und die 1:1 Begleitung durch Dr. Sophia! Ich fühle mich wirklich bestens vorbereitet, meine ersten Patient:innen zu behandeln.",
      name: "Dr. Laura Bergeest",
      title: "Ärztin in der Inneren Medizin",
      photoPath: "/kurse/grundkurs_botulinum/testimonials/testimonial-1.png",
    },
    {
      quote:
        "Ich liebe Sophias diversen und individuellen Ansatz an die ästhetische Medizin. Bei ihr steht der Mensch mit seinen ganz eigenen Vorstellungen und Wünschen im Zentrum der Behandlung, keine vorgefertigten „Schemata\". Ihre Kurse waren eine perfekte Kombination aus Theorie und Praxis und wurden mit großer fachlicher Kompetenz und viel Herzblut kuratiert.",
      name: "Nadja Geuther",
      title: "Ärztin in der Dermatologie",
      photoPath: "/kurse/grundkurs_botulinum/testimonials/testimonial-2.jpg",
    },
    {
      quote:
        "Sophias Kurs war sehr aufschlussreich für mich. Die detaillierte Erklärung der anatomischen Grundlagen und die praktischen Übungen haben meine Fähigkeiten deutlich verbessert. Besonders hilfreich fand ich die persönliche Betreuung und das Feedback während der Hands-on-Trainingseinheiten.",
      name: "Lawik Revend",
      title: "Arzt in der Chirurgie",
      photoPath: "/kurse/grundkurs_botulinum/testimonials/testimonial-3.png",
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*  Per-step metadata                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Static curriculum-step metadata that doesn't live in the DB
 * (format pills, slug for the per-course landing page, one-line
 * benefit). Title/CME are layered in server-side from `course_templates`
 * so they stay in sync with whatever Marc edits in the admin. The
 * Lernziele list is pulled from the course content file via
 * COURSE_CONTENT_BY_KEY so it doesn't have to be duplicated here.
 */
const STEP_META: Record<
  string,
  Pick<LernpfadStep, "formats" | "benefit" | "href"> & {
    cme?: string;
    fallbackTitle: string;
  }
> = {
  grundkurs_dermalfiller: {
    formats: ["Onlinekurs", "Praxiskurs"],
    benefit:
      "Dein sicherer Einstieg: Anatomie des Alterns, Mittelgesicht und die ersten Behandlungen unter Aufsicht.",
    href: "/kurse/grundkurs-dermalfiller",
    fallbackTitle: "Grundkurs Dermalfiller",
  },
  grundkurs_medizinische_hautpflege: {
    formats: ["Onlinekurs"],
    benefit:
      "Hautphysiologie, Akne, Rosazea und der Aufbau einer evidenzbasierten Pflegeroutine. Die Basis für jede ästhetische Behandlung.",
    href: "/kurse/grundkurs-medizinische-hautpflege",
    fallbackTitle: "Medizinische Hautpflege",
  },
  aufbaukurs_lippen: {
    formats: ["Onlinekurs", "Praxiskurs"],
    benefit:
      "Vertiefe Anatomie, Indikationen, Produktwahl und Technik der perioralen Zone, mit klarem Fokus auf Komplikationsmanagement.",
    href: "/kurse/aufbaukurs-lippen",
    fallbackTitle: "Aufbaukurs Lippen",
  },
  aufbaukurs_skulptra: {
    formats: ["Praxiskurs"],
    benefit:
      "Biostimulation mit Poly-L-Milchsäure und Skinbooster-Techniken für Hautqualität, Spannkraft und Volumen.",
    href: "/kurse/aufbaukurs-biostimulation-skinbooster",
    fallbackTitle: "Aufbaukurs Biostimulation & Skinbooster",
  },
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function CurriculumDermalfillerPage() {
  const supabase = createAdminClient();
  const courseKeys = CURRICULUM_DERMALFILLER.courses.map((c) => c.courseKey);

  const { data: templates } = await supabase
    .from("course_templates")
    .select("course_key, title, cme_online, cme_kombi")
    .in("course_key", courseKeys);

  const templateMap = new Map<
    string,
    {
      title?: string | null;
      cme_online?: string | null;
      cme_kombi?: string | null;
    }
  >();
  for (const t of templates ?? []) {
    templateMap.set(t.course_key as string, {
      title: t.title as string | null,
      cme_online: (t.cme_online as string | null) ?? null,
      cme_kombi: (t.cme_kombi as string | null) ?? null,
    });
  }

  // Build LernpfadStep[] in curriculum order. CME is picked for the
  // courseType configured on the curriculum (Onlinekurs vs Kombikurs).
  // Aufbaukurs Lippen and Aufbaukurs Biostimulation are currently
  // pending CME accreditation at the LÄK Berlin, so they render with
  // a "CME beantragt" pill until the approval lands.
  const steps: LernpfadStep[] = CURRICULUM_DERMALFILLER.courses
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .map((c) => {
      const meta = STEP_META[c.courseKey];
      const tmpl = templateMap.get(c.courseKey);
      const isOnline = c.courseType === "Onlinekurs";
      let cme: string | null = null;
      const PENDING_CME = new Set(["aufbaukurs_lippen", "aufbaukurs_skulptra"]);
      if (PENDING_CME.has(c.courseKey)) {
        cme = "CME beantragt";
      } else {
        const FALLBACK_CME: Record<string, string> = {
          grundkurs_dermalfiller: "18 CME",
          grundkurs_medizinische_hautpflege: "7 CME",
        };
        const dbCme = isOnline ? tmpl?.cme_online : tmpl?.cme_kombi;
        if (dbCme) {
          cme = /CME/i.test(dbCme) ? dbCme : `${dbCme} CME`;
        } else {
          cme = FALLBACK_CME[c.courseKey] ?? null;
        }
      }
      const courseContent =
        COURSE_CONTENT_BY_KEY[c.courseKey as keyof typeof COURSE_CONTENT_BY_KEY];
      const lernziele: LernpfadLernziel[] =
        courseContent?.lernziele.items.map((lz) => ({
          label: lz.label,
          description: lz.description,
        })) ?? [];

      return {
        number: c.sort,
        title: tmpl?.title || meta.fallbackTitle,
        formats: meta.formats,
        cme,
        benefit: meta.benefit,
        lernziele,
        href: meta.href,
      };
    });

  // Sum the leading number from each step's CME pill to get the total
  // CME a doctor accumulates by completing the entire curriculum. Steps
  // with "CME beantragt" contribute 0 — the pending status is called
  // out separately via the cmeNote on the destination card.
  const cmeTotal = steps.reduce((sum, s) => {
    const match = s.cme?.match(/(\d+)/);
    return sum + (match ? parseInt(match[1], 10) : 0);
  }, 0);
  const cmeTotalLabel = `${cmeTotal} CME-Punkte`;

  return (
    <>
      <section className="bg-[#FAEBE1] pt-20 pb-20 md:pt-28 md:pb-28">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className={`${TYPO.h1} text-4xl md:text-5xl lg:text-6xl mb-8`}>
              {HERO.heading}
            </h1>
            <p className="text-base md:text-lg text-black/75 leading-relaxed">
              {HERO.description}
            </p>
          </div>
        </div>
      </section>

      <Lernziele content={PERSONAS} />

      <Lernpfad
        heading="DEIN LERNPFAD"
        intro="Vier Schritte vom Einstieg bis zur Spezialisierung. Jede Karte verlinkt auf die jeweilige Kursseite, wo Du direkt buchen kannst."
        steps={steps}
        destination={{
          certificationName: "EPHIA Dermalfiller Specialist",
          certificationDescription: (
            <>
              Wer alle vier Kurse erfolgreich abschließt,{" "}
              <strong className="font-bold text-[#0066FF]">
                inklusive aller drei Praxiskurse
              </strong>
              , erhält das{" "}
              <strong className="font-bold text-[#0066FF]">
                EPHIA Dermalfiller Specialist Zertifikat
              </strong>{" "}
              als sichtbaren Beleg der vollständigen Spezialisierung.
            </>
          ),
          cmeTotal: cmeTotalLabel,
          cmeNote:
            "CME-Punkte für Aufbaukurs Lippen und Aufbaukurs Biostimulation & Skinbooster sind beantragt und werden nach Genehmigung ergänzt.",
        }}
      />

      {/* Outcomes — checklist on rose bg */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <div className="text-center mb-10 max-w-2xl mx-auto">
            <h2 className={`${TYPO.h2} mb-4`}>
              Was Du nach dem Curriculum kannst
            </h2>
            <p className="text-base md:text-lg text-black/70 leading-relaxed">
              Sechs konkrete Kompetenzen, die Du nach Abschluss aller vier
              Kurse mitnimmst.
            </p>
          </div>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {OUTCOMES.map((outcome) => (
              <li
                key={outcome}
                className="flex items-start gap-3 bg-[#FAEBE1] rounded-[10px] p-5"
              >
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0066FF] flex items-center justify-center mt-0.5"
                  aria-hidden="true"
                >
                  <Check
                    className="w-4 h-4 text-white"
                    strokeWidth={3}
                  />
                </span>
                <p className="text-sm md:text-base text-black leading-relaxed">
                  {outcome}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Lernziele content={FORMAT} />

      <Testimonials content={TESTIMONIALS} />

      <Faq content={{ heading: "FAQ", items: FAQS }} />

      <CtaBanner
        content={{
          heading: "Bereit anzufangen? Starte mit dem Grundkurs Dermalfiller.",
          ctaLabel: "Zum Grundkurs",
          ctaHref: "/kurse/grundkurs-dermalfiller",
        }}
      />
    </>
  );
}
