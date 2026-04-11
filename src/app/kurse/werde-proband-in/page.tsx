import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { AvailableSlot, Course } from "@/lib/types";
import { HeroVideo } from "../_components/sections/hero-video";
import { Faq } from "../_components/sections/faq";
import { TreatmentList } from "../_components/sections/treatment-list";
import { TYPO } from "../_components/typography";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Werde Proband:in | EPHIA",
  description:
    "Werde Proband:in bei EPHIA: Profitiere von günstigen ästhetischen Behandlungen durch approbierte Ärzt:innen und unterstütze gleichzeitig deren praktische Ausbildung.",
  alternates: { canonical: "https://kurse.ephia.de/kurse/werde-proband-in" },
};

// ---------------------------------------------------------------------
// Content — inline for easy tweaking.
// ---------------------------------------------------------------------

const hero = {
  heading: "Werde Proband:in",
  lead: "Im Rahmen unserer Ausbildungskurse suchen wir regelmäßig Proband:innen für Behandlungen durch unsere Ärzt:innen in Ausbildung. Du bekommst eine hochwertige Behandlung zum fairen Richtpreis und unterstützt gleichzeitig die praktische Ausbildung der nächsten Generation ästhetischer Mediziner:innen.",
  ctaLabel: "Jetzt Behandlung buchen",
  ctaHref: "#behandlungen",
  secondaryLabel: "So läuft's ab ↓",
  secondaryHref: "#so-laeufts-ab",
  videoPath:
    "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/proband:innen/IMG_9363.MP4",
};

const usps = [
  {
    icon: ShieldCheck,
    title: "Behandlungen auf höchstem Niveau",
    body: "Alle Behandlungen erfolgen durch approbierte Ärzt:innen, begleitet von erfahrenen Fachdozent:innen. So hast Du maximale Sicherheit und Transparenz während Deiner gesamten Behandlung.",
  },
  {
    icon: Sparkles,
    title: "Moderne Produkte & Techniken",
    body: "Wir arbeiten ausschließlich mit hochwertigen, zugelassenen Präparaten und den aktuellen Methoden der ästhetischen Medizin. Dieselben Standards wie in einer Privatpraxis.",
  },
  {
    icon: HeartHandshake,
    title: "Diskriminierungssensible Ausbildung",
    body: "Als Proband:in unterstützt Du eine werteorientierte medizinische Weiterbildung. Wir setzen uns für eine ästhetische Medizin ein, die Vielfalt sichtbar macht und alle Menschen mitdenkt, unabhängig von Alter, Geschlecht, Herkunft oder Körperform.",
  },
];

const steps = [
  {
    number: "1",
    title: "Kurs & Termin wählen",
    body: "Such Dir aus unseren offenen Ausbildungskursen die Behandlung und einen Termin aus, der Dir passt.",
  },
  {
    number: "2",
    title: "Buchung bestätigen",
    body: "Du hinterlegst ein Zahlungsmittel und bestätigst Deine Buchung. Der Richtpreis wird erst am Behandlungstag in der Praxis abgerechnet, nicht vorab.",
  },
  {
    number: "3",
    title: "Behandlung erhalten",
    body: "Am Kurstag wirst Du von einer approbierten Ärzt:in unter Aufsicht einer erfahrenen Dozent:in behandelt. Du bekommst dieselbe Sorgfalt wie in einer regulären Sprechstunde.",
  },
  {
    number: "4",
    title: "Weiterempfehlen",
    body: "Gefallen? Komm wieder zu einem unserer nächsten Kurse und bring gerne Freund:innen mit. Unsere Community wächst mit jedem zufriedenen Gesicht.",
  },
];

const faq = {
  heading: "Die häufigsten Fragen",
  items: [
    {
      question: "Wer kann eine Behandlung als Proband:in buchen?",
      answer:
        "Grundsätzlich jede erwachsene Person, die sich für eine ästhetische Behandlung interessiert und bereit ist, diese im Rahmen eines Ausbildungskurses zu erhalten. Für manche Behandlungen gelten medizinische Voraussetzungen. Diese findest Du in der jeweiligen Kursbeschreibung.",
    },
    {
      question: "Was kostet mich die Behandlung?",
      answer:
        "Die Behandlungen sind nicht kostenlos, aber deutlich günstiger als bei einer klassischen Privatpraxis. Den Richtpreis findest Du direkt bei jedem Kurs. Diesen reduzierten Preis verstehen wir als fairen Ausgleich dafür, dass Du uns dabei unterstützt, die nächste Generation von Ärzt:innen in ästhetischer Medizin auszubilden.",
    },
    {
      question: "Wird bei der Buchung sofort Geld abgebucht?",
      answer:
        "Nein. Bei der Buchung wird nur Dein Zahlungsmittel hinterlegt. Bezahlt wird am Kurstag direkt in der Praxis. Eine Ausnahme gibt es nur, wenn Du unentschuldigt nicht zum Termin erscheinst (siehe unten).",
    },
    {
      question: "Wer führt die Behandlung durch?",
      answer:
        "Approbierte Ärzt:innen, die sich bei uns in der ästhetischen Medizin weiterbilden. Sie werden während der gesamten Behandlung von erfahrenen Fachdozent:innen begleitet und supervidiert. Du wirst zu keinem Zeitpunkt allein gelassen.",
    },
    {
      question: "Wann und wo findet die Behandlung statt?",
      answer:
        "An den festen Kursterminen unserer Ausbildungskurse, in unseren Schulungspraxen. Datum, Uhrzeit und Ort stehen bei jedem Kurs und werden Dir nochmal in der Buchungsbestätigung per Mail geschickt.",
    },
    {
      question: "Was passiert, wenn ich meinen Termin absagen muss?",
      answer:
        "Wir bitten Dich, uns so früh wie möglich Bescheid zu geben, damit wir den Platz neu vergeben können. Bis 48 Stunden vor dem Termin kannst Du kostenfrei absagen. Wer unentschuldigt nicht erscheint, dem berechnen wir eine Ausfallgebühr von 50 €, aus Fairness gegenüber den Ärzt:innen, Dozent:innen und anderen Proband:innen, die auf den Platz gewartet hätten.",
    },
    {
      question: "Ist die Behandlung sicher?",
      answer:
        "Ja. Wir arbeiten ausschließlich mit zugelassenen Präparaten, nach geltenden Hygienestandards und mit doppelter Aufsicht durch Dozent:in und Ärzt:in. Solltest Du medizinische Fragen oder Vorerkrankungen haben, klären wir diese vorab gemeinsam im Anamnesegespräch.",
    },
  ],
};

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------

export default async function WerdeProbandInPage() {
  // Spiegeln dieselbe Abfrage wie /book, damit die Behandlungsliste weiter
  // unten auf dieser Seite dieselben Kurse + Slots zeigt wie der bestehende
  // Buchungs-Funnel. Die CTA der Kacheln verlinkt weiterhin auf
  // /book/{courseId}, sodass Slot-Auswahl und Stripe-Flow unverändert sind.
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: coursesData }, { data: slotsData }] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .eq("status", "online")
      .gte("course_date", today)
      .order("course_date", { ascending: true }),
    supabase
      .from("available_slots")
      .select("*")
      .gt("remaining_capacity", 0)
      .gt("start_time", new Date(Date.now() + 30 * 60 * 1000).toISOString())
      .order("start_time", { ascending: true }),
  ]);

  const courses = (coursesData as Course[] | null) ?? [];
  const slots = (slotsData as AvailableSlot[] | null) ?? [];

  return (
    <>
      {/* Hero — mirrors the home hero two-column split on desktop. */}
      <section className="bg-[#FAEBE1] pt-12 md:pt-20 pb-16 md:pb-24">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-14 items-center">
            <div>
              <h1 className={`${TYPO.h1} text-black`}>{hero.heading}</h1>
              <p className={`${TYPO.bodyLead} mt-6`}>{hero.lead}</p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={hero.ctaHref}
                  className="inline-flex items-center gap-2 text-base md:text-lg font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-7 py-4 transition-colors"
                >
                  <span>{hero.ctaLabel}</span>
                  <ArrowRight className="w-5 h-5" strokeWidth={2.25} />
                </Link>
                <a
                  href={hero.secondaryHref}
                  className="text-base md:text-lg font-semibold text-black/70 hover:text-[#0066FF] transition-colors"
                >
                  {hero.secondaryLabel}
                </a>
              </div>
            </div>

            <div>
              <HeroVideo
                videoPath={hero.videoPath}
                aspectClassName="aspect-[4/5] md:aspect-[4/5]"
                allowUnmute={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* So läuft's ab — 4 numbered steps. */}
      <section
        id="so-laeufts-ab"
        className="bg-[#FAEBE1] py-16 md:py-20 scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-14 max-w-2xl mx-auto">
            <h2 className={`${TYPO.h2} text-black`}>So läuft&apos;s ab</h2>
            <p className={`${TYPO.bodyLead} mt-4`}>
              Von der Buchung bis zur Behandlung, transparent und ohne böse
              Überraschungen.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {steps.map((s) => (
              <article
                key={s.number}
                className="bg-white rounded-[10px] p-7 md:p-8 flex flex-col"
              >
                <span
                  className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[#0066FF] text-white font-bold text-lg mb-5"
                  aria-hidden="true"
                >
                  {s.number}
                </span>
                <h3 className="text-lg md:text-xl font-bold text-black tracking-wide leading-tight">
                  {s.title}
                </h3>
                <p className="text-sm md:text-base text-black/75 leading-relaxed mt-3">
                  {s.body}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-12 md:mt-14 text-center">
            <Link
              href="#behandlungen"
              className="inline-flex items-center gap-2 text-base md:text-lg font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-7 py-4 transition-colors"
            >
              <span>Jetzt Behandlung buchen</span>
              <ArrowRight className="w-5 h-5" strokeWidth={2.25} />
            </Link>
          </div>
        </div>
      </section>

      {/* Behandlungsangebote — synchronisiert mit /book. */}
      <TreatmentList courses={courses} slots={slots} />

      {/* USPs — three value pillars. */}
      <section className="bg-[#FAEBE1] py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-14">
            <h2 className={`${TYPO.h2} text-black`}>Darum zu EPHIA</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {usps.map((u) => {
              const Icon = u.icon;
              return (
                <article
                  key={u.title}
                  className="bg-white rounded-[10px] p-7 md:p-8 flex flex-col"
                >
                  <div className="w-12 h-12 rounded-full bg-[#0066FF]/10 flex items-center justify-center mb-5">
                    <Icon
                      className="w-6 h-6 text-[#0066FF]"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-black tracking-wide leading-tight">
                    {u.title}
                  </h3>
                  <p className="text-sm md:text-base text-black/75 leading-relaxed mt-3">
                    {u.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ — reuses the shared /kurse Faq section. */}
      <Faq content={faq} />
    </>
  );
}
