import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  Calendar,
  Coffee,
  Heart,
  MessageCircle,
  MessagesSquare,
  Users,
} from "lucide-react";
import { TYPO } from "../_components/typography";

export const metadata: Metadata = {
  title: "Unsere Community | EPHIA",
  description:
    "Die EPHIA Community: Ärzt:innen, die sich trauen, Fragen zu stellen. WhatsApp-Austausch, regelmäßige Meetups und Community-Events für Kolleg:innen, die ästhetische Medizin anders denken.",
  alternates: { canonical: "https://ephia.de/community" },
};

// ---------------------------------------------------------------------
// Content — inline so it's easy to tweak without a separate file.
// Swap the WhatsApp screenshot paths below once the real images are in
// Supabase (folder: marketing-assets/community). Until then, the cards
// render a tasteful "Screenshot folgt" placeholder instead of a broken
// image.
// ---------------------------------------------------------------------

const hero = {
  heading: "Unsere Community",
  lead: "Ärzt:innen, die sich trauen, Fragen zu stellen. Und Kolleg:innen, die sie ernst nehmen.",
};

const values = [
  {
    icon: Heart,
    title: "Haltung",
    body: "Patient:innenzentriert, diskriminierungssensibel und immer bereit, dazuzulernen.",
  },
  {
    icon: MessagesSquare,
    title: "Wissen im Austausch",
    body: "Keine Dozent:in-auf-dem-Podest. Wir teilen Fälle, Fragen und Fehler  auf Augenhöhe.",
  },
  {
    icon: Users,
    title: "Echte Verbindungen",
    body: "Aus Kolleg:innen werden Freund:innen. Die Community hört nicht nach dem Kurs auf.",
  },
];

const touchpoints = [
  {
    icon: MessageCircle,
    title: "WhatsApp-Community",
    body: "Der Puls der Community. Tägliche Fragen, schnelle Second Opinions und eine echte „Hilft mir mal\"-Kultur.",
  },
  {
    icon: Coffee,
    title: "Regelmäßige Meetups",
    body: "Kleine, entspannte Treffen in verschiedenen Städten. Austausch unter Kolleg:innen, ohne Fortbildungsdruck.",
  },
  {
    icon: Calendar,
    title: "Community-Events",
    body: "Größere Formate wie Abendessen, gemeinsame Workshops und Meetups auf Kongressen.",
  },
];

/**
 * WhatsApp screenshot paths. Leave an entry's `imagePath` as `null`
 * while waiting for the real screenshot — the card will render a
 * placeholder. Replace with the Supabase public URL once uploaded.
 */
const whatsappScreenshots: Array<{
  imagePath: string | null;
  imageAlt: string;
}> = [
  {
    imagePath:
      "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/community/image-1.png",
    imageAlt: "WhatsApp-Screenshot einer Frage aus der Community",
  },
  {
    imagePath:
      "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/community/image-2.png",
    imageAlt: "WhatsApp-Screenshot einer Antwort aus der Community",
  },
  {
    imagePath:
      "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/marketing-assets/community/image-3.png",
    imageAlt: "WhatsApp-Screenshot einer Diskussion aus der Community",
  },
];

const testimonials = [
  {
    quote:
      "Die Community ist für mich der Ort, an dem ich meine Fälle zeigen kann, ohne Angst zu haben, dumme Fragen zu stellen. Genau das hat mir vorher gefehlt.",
    name: "Dr. Anna M.",
    role: "Anästhesistin",
  },
  {
    quote:
      "Ich habe durch den Austausch in der Community mehr gelernt als durch viele klassische Fortbildungen zusammen. Hier ist man nie alleine mit einer Frage.",
    name: "Dr. Lisa K.",
    role: "Dermatologin",
  },
  {
    quote:
      "Was ich am meisten schätze: niemand tut so, als wüsste er alles. Das nimmt so viel Druck aus der Praxis.",
    name: "Dr. Thomas R.",
    role: "Allgemeinmediziner",
  },
];

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------

export default function CommunityPage() {
  return (
    <>
      {/* Hero — matches the team & vision page heros. */}
      <section className="bg-[#FAEBE1] pt-16 md:pt-24 pb-10 md:pb-14">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <h1 className={`${TYPO.h1} text-black`}>{hero.heading}</h1>
          <p className={`${TYPO.bodyLead} mt-6`}>{hero.lead}</p>
        </div>
      </section>

      {/* Was uns ausmacht — three value pillars. */}
      <section className="bg-[#FAEBE1] py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-14">
            <h2 className={`${TYPO.h2} text-black`}>Was uns ausmacht</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <article
                  key={v.title}
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
                    {v.title}
                  </h3>
                  <p className="text-sm md:text-base text-black/75 leading-relaxed mt-3">
                    {v.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Wie die Community lebt — three touchpoints. */}
      <section className="bg-[#FAEBE1] py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-14 max-w-2xl mx-auto">
            <h2 className={`${TYPO.h2} text-black`}>Wie die Community lebt</h2>
            <p className={`${TYPO.bodyLead} mt-4`}>
              Drei Formate, die sich ergänzen: der tägliche Austausch im Chat,
              kleine Treffen in Städten und größere Community-Events im Jahr.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {touchpoints.map((t) => {
              const Icon = t.icon;
              return (
                <article
                  key={t.title}
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
                    {t.title}
                  </h3>
                  <p className="text-sm md:text-base text-black/75 leading-relaxed mt-3">
                    {t.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ein Blick in unsere WhatsApp-Community — screenshots. */}
      <section className="bg-[#FAEBE1] py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-14 max-w-2xl mx-auto">
            <h2 className={`${TYPO.h2} text-black`}>
              Ein Blick in die WhatsApp-Community
            </h2>
            <p className={`${TYPO.bodyLead} mt-4`}>
              Ein paar Fragen, die kürzlich in der Community gestellt und
              beantwortet wurden.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-4xl mx-auto">
            {whatsappScreenshots.map((s, i) => (
              <div
                key={i}
                className="relative w-full bg-white rounded-[20px] overflow-hidden shadow-sm"
                style={{ aspectRatio: "9 / 16" }}
              >
                {s.imagePath ? (
                  <Image
                    src={s.imagePath}
                    alt={s.imageAlt}
                    fill
                    quality={90}
                    sizes="(min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6"
                    aria-hidden="true"
                  >
                    <MessageCircle
                      className="w-8 h-8 text-black/20"
                      strokeWidth={1.75}
                    />
                    <span className="text-xs md:text-sm font-medium text-black/40">
                      Screenshot folgt
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stimmen aus der Community — placeholder testimonials. */}
      <section className="bg-[#FAEBE1] py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-14">
            <h2 className={`${TYPO.h2} text-black`}>Stimmen aus der Community</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {testimonials.map((t, i) => (
              <article
                key={i}
                className="bg-white rounded-[10px] p-7 md:p-8 flex flex-col"
              >
                <p className="text-sm md:text-base text-black/80 leading-relaxed flex-1">
                  „{t.quote}"
                </p>
                <div className="mt-6 pt-5 border-t border-black/5">
                  <p className="text-sm md:text-base font-bold text-black">
                    {t.name}
                  </p>
                  <p className="text-xs md:text-sm font-medium text-[#0066FF] mt-0.5">
                    {t.role}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — how to join. */}
      <section className="bg-[#FAEBE1] pt-10 md:pt-14 pb-24 md:pb-32">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <h2 className={`${TYPO.h2} text-black`}>So wirst Du Teil der Community</h2>
          <p className={`${TYPO.bodyLead} mt-5`}>
            Jede:r Teilnehmer:in unserer Kurse erhält nach der Buchung
            automatisch einen Invite-Link in die WhatsApp-Community. Nach
            Deinem ersten Kurs bist Du dabei  einfach so.
          </p>

          <div className="mt-10">
            <a
              href="/kurse/unsere-kurse"
              className="inline-flex items-center gap-2 text-base md:text-lg font-bold text-white bg-[#0066FF] hover:bg-[#0055DD] rounded-[10px] px-7 py-4 transition-colors"
            >
              <span>Kurse entdecken</span>
              <ArrowRight className="w-5 h-5" strokeWidth={2.25} />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
