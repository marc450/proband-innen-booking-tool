import type { Metadata } from "next";
import { Check } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { CURRICULUM_BOTULINUM } from "@/lib/curricula";
import { TYPO } from "../_components/typography";
import { Lernziele } from "../_components/sections/lernziele";
import { Lernpfad, type LernpfadStep } from "../_components/sections/lernpfad";
import { Faq } from "../_components/sections/faq";
import { CtaBanner } from "../_components/sections/cta-banner";
import { Testimonials } from "../_components/sections/testimonials";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Curriculum Botulinum | EPHIA",
  description:
    "Dein strukturierter Weg zur Spezialisierung in der Botulinum-Therapie. Vier aufeinander aufbauende Kurse vom Einstieg bis zur Masterclass, plus die Möglichkeit zur EPHIA Botulinum Specialist Zertifizierung.",
  alternates: {
    canonical: "https://kurse.ephia.de/kurse/curriculum-botulinum",
  },
};

/* -------------------------------------------------------------------------- */
/*  Static curriculum content                                                 */
/* -------------------------------------------------------------------------- */

const HERO = {
  heading: "CURRICULUM BOTULINUM",
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
        "Du bist Ärzt:in und willst einen sicheren, leitliniengerechten Einstieg in die Botulinum-Therapie. Der Grundkurs gibt Dir das Fundament, der Rest des Curriculums baut Schritt für Schritt darauf auf.",
    },
    {
      icon: "Target",
      label: "Du willst systematisch aufbauen",
      description:
        "Du hast bereits erste Erfahrungen mit Botulinum und möchtest Dein Wissen strukturiert erweitern. Therapeutische Indikationen wie Bruxismus, Migräne oder Hyperhidrose öffnen Dir neue Behandlungsfelder in Deiner Praxis.",
    },
    {
      icon: "GraduationCap",
      label: "Du willst zur Masterclass",
      description:
        "Du behandelst schon länger und suchst Feinschliff auf Expert:innen-Niveau: fortgeschrittene Techniken, komplexe Fälle und souveränes Komplikationsmanagement. Das Curriculum führt Dich dorthin.",
    },
  ],
};

const OUTCOMES = [
  "Du führst Botulinum-Behandlungen sicher, anatomisch fundiert und leitliniengerecht durch.",
  "Du erkennst Kontraindikationen und berätst Deine Patient:innen professionell und diskriminierungssensibel.",
  "Du beherrschst therapeutische Indikationen wie Bruxismus, chronische Migräne, muskuläre Verspannungen und Hyperhidrose.",
  "Du integrierst medizinische Hautpflege in Deine Behandlungskonzepte und berätst ganzheitlich.",
  "Du gehst souverän mit Komplikationen um und hast klare Strategien für den Ernstfall.",
  "Du behandelst auf Masterclass-Niveau mit fortgeschrittenen Injektionstechniken.",
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
      "Wir empfehlen die Reihenfolge Grundkurs Botulinum → Medizinische Hautpflege → Aufbaukurs Therapeutische Indikationen → Masterclass, weil die Inhalte aufeinander aufbauen. Du kannst die Online-Teile parallel laufen lassen und die Praxiskurse flexibel im Rahmen der verfügbaren Termine buchen.",
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
      "Ja. Wenn Du alle vier Kurse erfolgreich abgeschlossen hast, erhältst Du das EPHIA Botulinum Specialist Zertifikat, ergänzend zu den Einzelzertifikaten der jeweiligen Kurse.",
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
      "Ja, jeder akkreditierte Kurs im Curriculum bringt CME-Punkte. Die genaue Anzahl siehst Du auf der jeweiligen Kurskarte. Aktuell sind Grundkurs Botulinum, Medizinische Hautpflege und Therapeutische Indikationen akkreditiert; die CME-Punkte für die Masterclass sind beantragt.",
  },
  {
    question: "Was, wenn ich einen Praxistermin verpassen muss?",
    answer:
      "Kein Stress. Melde Dich rechtzeitig bei uns, wir finden einen Ersatztermin in einer der nächsten Gruppen.",
  },
  {
    question: "Für wen ist das Curriculum geeignet?",
    answer:
      "Das Curriculum richtet sich an approbierte Ärzt:innen, die in die Botulinum-Therapie einsteigen oder ihre bestehenden Kenntnisse systematisch vertiefen wollen. Weitere Voraussetzungen gibt es nicht.",
  },
];

const TESTIMONIALS = {
  heading: "#wearetogether",
  subheading: "Was Ärzt:innen aus dem Curriculum sagen",
  items: [
    {
      quote:
        "Der Grundkurs Botulinum war der erste Kurs der Dr. Sophia Academy, den ich besucht habe und er hat mich sehr überzeugt! Besonders gut fand ich die praktischen Übungen an Proband:innen und die 1:1 Begleitung durch Dr. Sophia! Auch die Erklärung der MD-Codes fand ich sehr aufschlussreich. Ich fühle mich wirklich bestens vorbereitet, meine ersten Patient:innen zu behandeln.",
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
 * (format pill, slug for the per-course landing page, one-line
 * benefit). Title/price/CME are layered in server-side from
 * `course_templates` so they stay in sync with whatever Marc edits in
 * the admin.
 */
const STEP_META: Record<
  string,
  Pick<LernpfadStep, "format" | "benefit" | "href"> & {
    /** Override for the CME pill text. When unset, falls back to the DB. */
    cme?: string;
    /** Static title used if the DB title is unavailable (course not live). */
    fallbackTitle: string;
  }
> = {
  grundkurs_botulinum: {
    format: "Online- & Praxiskurs",
    benefit:
      "Dein sicherer Einstieg: Anatomie, Indikationen, Beratung und die ersten Behandlungen unter Aufsicht.",
    href: "/kurse/grundkurs-botulinum",
    fallbackTitle: "Botulinum",
  },
  grundkurs_medizinische_hautpflege: {
    format: "Onlinekurs",
    benefit:
      "Hautphysiologie, Akne, Rosazea und der Aufbau einer evidenzbasierten Pflegeroutine. Die Basis für jede ästhetische Behandlung.",
    href: "/kurse/grundkurs-medizinische-hautpflege",
    fallbackTitle: "Medizinische Hautpflege",
  },
  aufbaukurs_therapeutische_indikationen_botulinum: {
    format: "Online- & Praxiskurs",
    benefit:
      "Bruxismus, chronische Migräne, Hyperhidrose und mehr. Du öffnest Dir neue Behandlungsfelder mit therapeutischem Fokus.",
    href: "/kurse/aufbaukurs-therapeutische-indikationen-botulinum",
    fallbackTitle: "Therapeutische Indikationen Botulinum",
  },
  masterclass_botulinum: {
    format: "Online- & Praxiskurs",
    benefit:
      "Full Face Analyse, fortgeschrittene Injektionstechniken und souveränes Komplikationsmanagement auf Expert:innen-Niveau.",
    href: "/kurse/masterclass-botulinum",
    fallbackTitle: "Masterclass Botulinum",
  },
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function CurriculumBotulinumPage() {
  const supabase = createAdminClient();
  const courseKeys = CURRICULUM_BOTULINUM.courses.map((c) => c.courseKey);

  // Pull live template data (price, title, CME) so the curriculum
  // steps stay in sync with whatever the admin edits per course.
  const { data: templates } = await supabase
    .from("course_templates")
    .select(
      "course_key, title, price_gross_online, price_gross_kombi, cme_online, cme_kombi",
    )
    .in("course_key", courseKeys);

  const templateMap = new Map<
    string,
    {
      title?: string | null;
      price_gross_online?: number | null;
      price_gross_kombi?: number | null;
      cme_online?: string | null;
      cme_kombi?: string | null;
    }
  >();
  for (const t of templates ?? []) {
    templateMap.set(t.course_key as string, {
      title: t.title as string | null,
      price_gross_online: (t.price_gross_online as number | null) ?? null,
      price_gross_kombi: (t.price_gross_kombi as number | null) ?? null,
      cme_online: (t.cme_online as string | null) ?? null,
      cme_kombi: (t.cme_kombi as string | null) ?? null,
    });
  }

  const formatPrice = (amount: number | null | undefined) =>
    amount ? `EUR ${amount.toLocaleString("de-DE")}` : "Preis auf Anfrage";

  // Build LernpfadStep[] in curriculum order. Pick the price/CME for
  // the courseType configured on the curriculum (Onlinekurs vs Kombikurs).
  const steps: LernpfadStep[] = CURRICULUM_BOTULINUM.courses
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .map((c) => {
      const meta = STEP_META[c.courseKey];
      const tmpl = templateMap.get(c.courseKey);
      const isOnline = c.courseType === "Onlinekurs";
      const price = isOnline
        ? tmpl?.price_gross_online
        : tmpl?.price_gross_kombi;
      // Per-course CME on the curriculum step. The Masterclass overrides
      // its CME to call out that the Onlinekurs (Periorale Zone) carries
      // 10 CME while the Praxis accreditation is still pending. Other
      // steps fall back to a hardcoded value when the DB column is NULL
      // so the path always renders all four CME pills consistently.
      let cme: string | null = null;
      if (c.courseKey === "masterclass_botulinum") {
        cme = "10 CME · Praxis beantragt";
      } else {
        const FALLBACK_CME: Record<string, string> = {
          grundkurs_botulinum: "22 CME",
          grundkurs_medizinische_hautpflege: "7 CME",
          aufbaukurs_therapeutische_indikationen_botulinum: "21 CME",
        };
        const dbCme = isOnline ? tmpl?.cme_online : tmpl?.cme_kombi;
        if (dbCme) {
          // DB stores either a bare number ("21") or a value already
          // containing "CME" — normalise both to "<n> CME".
          cme = /CME/i.test(dbCme) ? dbCme : `${dbCme} CME`;
        } else {
          cme = FALLBACK_CME[c.courseKey] ?? null;
        }
      }
      return {
        number: c.sort,
        title: tmpl?.title || meta.fallbackTitle,
        format: meta.format,
        cme,
        price: formatPrice(price),
        benefit: meta.benefit,
        href: meta.href,
      };
    });

  // Sum the leading number from each step's CME pill to get the total
  // CME a doctor accumulates by completing the entire curriculum
  // (always booking the Online + Praxis combination where available).
  // Only the *first* number is parsed, so values like
  // "10 CME · Praxis beantragt" contribute the approved 10 — the
  // pending praxis-CME of the Masterclass is acknowledged separately
  // via the cmeNote on the destination card.
  const cmeTotal = steps.reduce((sum, s) => {
    const match = s.cme?.match(/(\d+)/);
    return sum + (match ? parseInt(match[1], 10) : 0);
  }, 0);
  const cmeTotalLabel = `${cmeTotal} CME-Punkte`;

  return (
    <>
      <section className="bg-[#FAEBE1] pt-20 pb-20 md:pt-28 md:pb-28">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
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
        intro="Vier Schritte vom Einstieg bis zur Masterclass. Jede Karte verlinkt auf die jeweilige Kursseite, wo Du direkt buchen kannst."
        steps={steps}
        destination={{
          certificationName: "EPHIA Botulinum Specialist",
          certificationDescription: (
            <>
              Wer alle vier Kurse des Curriculums erfolgreich abschließt,
              erhält das{" "}
              <strong className="font-bold text-[#0066FF]">
                EPHIA Botulinum Specialist Zertifikat
              </strong>{" "}
              als sichtbaren Beleg der vollständigen Spezialisierung.
            </>
          ),
          cmeTotal: cmeTotalLabel,
          cmeNote:
            "Praxis-CME der Masterclass sind beantragt und werden nach Genehmigung ergänzt.",
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
          heading: "Bereit anzufangen? Starte mit dem Grundkurs Botulinum.",
          ctaLabel: "Zum Grundkurs",
          ctaHref: "/kurse/grundkurs-botulinum",
        }}
      />
    </>
  );
}
