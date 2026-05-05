import type { Metadata } from "next";
import {
  GraduationCap,
  Heart,
  Presentation,
  RefreshCw,
  Shapes,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { TYPO } from "../_components/typography";

export const metadata: Metadata = {
  title: "Unsere Didaktik | EPHIA",
  description:
    "Die EPHIA Didaktik: hohe Ausbildungsqualität, inklusive ästhetische Praxis und ein ganzheitlicher Lernansatz, der Dich zur handlungssicheren Fachperson macht.",
  alternates: { canonical: "https://ephia.de/didaktik" },
};

// ---------------------------------------------------------------------
// Content — inline so it's easy to tweak without a separate file.
// Mirrors www.ephia.de/unsere-didaktik and matches the community / vision
// page structure.
// ---------------------------------------------------------------------

const hero = {
  heading: "Unsere Didaktik",
  lead: "Wir bieten unseren Nutzer:innen eine hohe Ausbildungsqualität. Dazu gehört eine Didaktik, die diesem Anspruch gerecht wird. Hier erfährst Du, wie wir Dich zur handlungssicheren Fachperson ausbilden werden.",
};

const ziele = [
  {
    icon: Sparkles,
    title: "Förderung von Kompetenz & Selbstvertrauen",
    body: "Unser didaktischer Ansatz konzentriert sich darauf, sowohl Wissen zu vermitteln, wie auch das Selbstvertrauen der Teilnehmenden in ihre praktischen Fähigkeiten zu stärken. Wir schaffen eine unterstützende Lernumgebung, die Dich dazu ermutigt, neue Techniken auszuprobieren und Deine Fähigkeiten durch direkte praktische Erfahrungen zu verbessern.",
  },
  {
    icon: Target,
    title: "Entwicklung inklusiver ästhetischer Praxis",
    body: "Unser Ziel ist es, Dich optimal auf die umfassende und professionelle Betreuung eines vielfältigen Klientels vorzubereiten. Durch die Integration inklusiver und praxisnaher Praktiken in unsere Lehrpläne wird sichergestellt, dass unsere Ausbildung alle relevanten Aspekte der Patient:innenversorgung berücksichtigt, darunter kulturelle, ethnische und geschlechtsspezifische Besonderheiten.",
  },
  {
    icon: TrendingUp,
    title: "Kontinuierliche berufliche Weiterentwicklung",
    body: "Die Akademie fördert Dein berufliches Wachstum durch Gemeinschaftsveranstaltungen, interaktive Online-Konferenzen und Zugang zu renommierten Expert:innen. Wir unterstützen eine Kultur des lebenslangen Lernens, indem wir aktuelle und relevante Ressourcen bereitstellen, die es Dir ermöglichen, Dich kontinuierlich weiterzuentwickeln und auf dem neuesten Stand zu bleiben.",
  },
];

const methodik = [
  {
    icon: Presentation,
    title: "Expert:innengeleitetes Lernen",
    body: "Unsere Kurse werden von erfahrenen Ärzt:innen geleitet, um die Ausbildung auf praxisnahe Verfahren und modernste Techniken zu konzentrieren. Das ermöglicht es Dir, sowohl theoretisches Wissen zu erwerben, als auch praktische Einblicke in die Herausforderungen des beruflichen Alltags zu gewinnen und theoretische Kenntnisse effektiv in die Praxis umzusetzen.",
  },
  {
    icon: Heart,
    title: "Patient:innenzentriertes Lernen",
    body: "Das Curriculum ist speziell auf die individuellen Bedürfnisse und die Vielfalt der Patient:innen zugeschnitten. Es berücksichtigt kulturelle Hintergründe, Geschlecht, Alter und Persönlichkeiten in der ästhetischen Medizin. Das fördert ein breites Verständnis für die Einzigartigkeit Deiner Patient:innen und ermöglicht es Dir, maßgeschneiderte Behandlungspläne zu entwickeln.",
  },
  {
    icon: RefreshCw,
    title: "Ganzheitliches Lernen",
    body: "Wir integrieren theoretisches Wissen mit praktischen Fähigkeiten und berücksichtigen dabei umfassende Patient:innenberatung, ethische Praxis und individuelle Behandlungsplanung. Durch diesen ganzheitlichen Ansatz wirst Du darauf vorbereitet, hervorragende ästhetische Ergebnisse zu erzielen und das Vertrauen sowie die langfristige Zufriedenheit Deiner Patient:innen zu fördern.",
  },
  {
    icon: GraduationCap,
    title: "Integriertes Lernen",
    body: "Unsere Plattform bietet eine Mischung aus Online-Theorie und Offline-Praxis, um ein umfassendes Verständnis und die Beherrschung von Fähigkeiten zu gewährleisten. Dies ermöglicht es den Lernenden, flexibel und effektiv zu lernen und das Gelernte direkt in einem realen Kontext anzuwenden, was sowohl theoretische als auch praktische Fähigkeiten stärkt.",
  },
  {
    icon: Shapes,
    title: "Interaktives Lernen",
    body: "Wir setzen auf eine Vielzahl von Lernmaterialien wie Videos, Podcasts, Fallstudien und Simulationen, die auf verschiedene Lernstile abgestimmt sind und das Engagement erhöhen. Diese interaktiven und ansprechenden Materialien fördern aktives Lernen, kritisches Denken und die praktische Anwendung von Wissen in verschiedenen Szenarien.",
  },
  {
    icon: UsersRound,
    title: "Community-Lernen",
    body: "Die Rolle einer unterstützenden Gemeinschaft ist entscheidend für das fortlaufende Lernen. Unsere Community bietet eine Plattform für Diskussionen und Peer-Support, fördert kontinuierliches Lernen und schafft eine dynamische Umgebung, in der Lernende von Materialien, Dozent:innen und voneinander lernen und dadurch ihr Verständnis vertiefen.",
  },
];

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------

type Card = {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  title: string;
  body: string;
};

function DidaktikCard({ card }: { card: Card }) {
  const Icon = card.icon;
  return (
    <article className="bg-white rounded-[10px] p-7 md:p-8 flex flex-col text-center items-center">
      <div className="w-12 h-12 rounded-full bg-[#0066FF]/10 flex items-center justify-center mb-5">
        <Icon className="w-6 h-6 text-[#0066FF]" strokeWidth={2} aria-hidden />
      </div>
      <h3 className="text-lg md:text-xl font-bold text-black tracking-wide leading-tight">
        {card.title}
      </h3>
      <p className="text-sm md:text-base text-black/75 leading-relaxed mt-3">
        {card.body}
      </p>
    </article>
  );
}

export default function DidaktikPage() {
  return (
    <>
      {/* Hero — matches the community / team / vision page heros. */}
      <section className="bg-[#FAEBE1] pt-16 md:pt-24 pb-10 md:pb-14">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <h1 className={`${TYPO.h1} text-black`}>{hero.heading}</h1>
          <p className={`${TYPO.bodyLead} mt-6`}>{hero.lead}</p>
        </div>
      </section>

      {/* Ziele — three goal pillars. */}
      <section className="bg-[#FAEBE1] py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-14">
            <h2 className={`${TYPO.h2} text-black`}>Ziele</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {ziele.map((card) => (
              <DidaktikCard key={card.title} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* Methodik — six methods in two rows of three. */}
      <section className="bg-[#FAEBE1] py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-12 md:mb-14 max-w-2xl mx-auto">
            <h2 className={`${TYPO.h2} text-black`}>Methodik</h2>
            <p className={`${TYPO.bodyLead} mt-4`}>So wirst Du mit uns besser!</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {methodik.map((card) => (
              <DidaktikCard key={card.title} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* Bottom breather to match the community page rhythm. */}
      <section className="bg-[#FAEBE1] pb-24 md:pb-32" aria-hidden />
    </>
  );
}
