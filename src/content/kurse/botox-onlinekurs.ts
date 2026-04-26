import type { CourseLandingContent } from "./types";
import { grundkursBotulinum } from "./grundkurs-botulinum";

/**
 * Botox-Onlinekurs — pure-online performance landing page.
 *
 * Sells ONLY the Onlinekurs and must NOT hint that a Praxiskurs exists.
 * Implementation:
 *   - hideBookingWidget: true → kills the cards section AND the
 *     Gruppenbuchungen pitch (gated by the same flag in [slug]/page).
 *   - Hero CTA + CtaBanner use directCheckoutCourseKey so both buttons
 *     fire Stripe checkout for the Onlinekurs price directly.
 *   - Praxis-leaning testimonials and FAQ from the Grundkurs are NOT
 *     inherited; we ship online-only quotes and online-only FAQ.
 *   - Course JSON-LD on [slug]/page also suppresses Praxis sessions
 *     when hideBookingWidget is true, so structured data stays
 *     consistent with what the page actually shows.
 *
 * NOTE: Performance landing page, "Botox" wording is permitted per CI.
 * The hero subheadline references {cme_online}, which the page
 * renderer substitutes from `course_templates.cme_online` so the
 * accreditation claim stays accurate without a content-file edit.
 */
export const botoxOnlinekurs: CourseLandingContent = {
  slug: "botox-onlinekurs",
  // Reads price + CME from the grundkurs_botulinum template.
  courseKey: "grundkurs_botulinum",

  meta: {
    title: "Botox-Onlinekurs für Ärzt:innen, CME-akkreditiert | EPHIA",
    description:
      "Botox-Onlinekurs für approbierte Ärzt:innen und Zahnärzt:innen: Anatomie, Indikationen, Behandlungsvideos, CME-Test. Höchstakkreditierter Botulinum-Onlinekurs im DACH-Raum, flexibel und ortsunabhängig.",
    ogImage: "/kurse/grundkurs_botulinum/og-image.jpg",
  },

  hero: {
    heading: "BOTOX-ONLINEKURS",
    socialProof: "Über 300 Ärzt:innen mit EPHIA-Onlinekurs zertifiziert",
    ctaStacked: true,
    subheadline:
      "Mit {cme_online} CME-Punkten der höchstakkreditierte Botulinum-Onlinekurs im DACH-Raum.",
    stats: [
      { icon: "Clock", label: "Format", value: "ca. 10h Inhalt" },
      { icon: "Award", label: "Akkreditiert", value: "{cme_online} CME-Punkte + Zertifikat" },
      { icon: "GraduationCap", label: "Level", value: "Einsteigerkurs" },
    ],
    description:
      "Unser Botox-Onlinekurs vermittelt Dir die theoretischen Grundlagen der ästhetischen Botulinum-Anwendung. Du lernst Anatomie, Produktkunde, Indikationen, diskriminierungssensible Beratung und Komplikationsmanagement, mit dichten Behandlungsvideos zu jeder Zone. Inhalte sind selbstgesteuert, ortsunabhängig im DACH-Raum und mit CME-Test am Kapitelende. Voraussetzung ist Deine Approbation als Ärzt:in.",
    videoPath: grundkursBotulinum.hero.videoPath,
    videoPoster: grundkursBotulinum.hero.videoPoster,
    ctaOverride: {
      label: "Onlinekurs jetzt buchen",
      directCheckoutCourseKey: "grundkurs_botulinum",
    },
  },

  // Pure-online: skip the booking widget AND the Gruppenbuchungen
  // pitch (both gated by this flag in [slug]/page.tsx).
  hideBookingWidget: true,

  lernziele: {
    heading: "LERNZIELE",
    intro:
      "Im Botox-Onlinekurs lernst Du die kompletten theoretischen Grundlagen der ästhetischen Botulinum-Anwendung. Im Fokus stehen folgende Lernziele:",
    items: grundkursBotulinum.lernziele.items,
  },

  kursangeboteHeading: "BOTOX-ONLINEKURS",

  // Required by the type but not rendered (hideBookingWidget is true).
  gruppenbuchungen: {
    heading: "GRUPPENBUCHUNGEN",
    description: "",
    ctaLabel: "",
    ctaHref: "",
  },

  inhalt: grundkursBotulinum.inhalt,

  lernplattform: grundkursBotulinum.lernplattform,

  ctaBanner: {
    heading: "Bereit für Deinen Botulinum-Einstieg im Onlinekurs?",
    ctaLabel: "Onlinekurs jetzt buchen",
    ctaHref: "#kursangebote",
    directCheckoutCourseKey: "grundkurs_botulinum",
  },

  testimonials: {
    heading: "STIMMEN ZUM ONLINEKURS",
    // TODO Marc: replace with real online-course-specific testimonials.
    // Names below are placeholders.
    items: [
      {
        quote:
          "Dieser Onlinekurs ist genau das, was ich für den theoretischen Einstieg gebraucht habe. Die Behandlungsvideos zu jeder Indikation sind fachlich präzise und detailliert. Der CME-Test am Ende jedes Kapitels hat mir geholfen, das Gelernte direkt zu festigen.",
        name: "Dr. Marie Klein",
        title: "Ärztin in der Inneren Medizin",
      },
      {
        quote:
          "Was mich überzeugt hat: evidenzbasierte Inhalte, klar strukturiert und auf den Punkt. Ich konnte die Module flexibel zwischen Schichten und am Wochenende durchgehen. So konnte ich Botulinum theoretisch fundiert in meinen Praxisalltag integrieren.",
        name: "Dr. Thomas Schäfer",
        title: "Allgemeinmedizin",
      },
      {
        quote:
          "Ehrlich gesagt war ich skeptisch, ob ein Onlinekurs allein wirklich Sicherheit gibt. Was mich überzeugt hat: die Behandlungsvideos sind so detailliert, dass ich nach mehrfachem Anschauen jeden Injektionspunkt nachvollziehen konnte. Die Tests am Kapitelende fand ich fair, kein reines Abfragen.",
        name: "Lena Roth",
        title: "Dermatologie",
      },
    ],
  },

  faq: {
    heading: "FAQ",
    items: [
      {
        question: "Wie schnell habe ich Zugang zum Botox-Onlinekurs nach der Buchung?",
        answer:
          "Sofort. Direkt nach erfolgreicher Zahlung erhältst Du Deine Login-Daten per E-Mail und kannst sofort starten. Das gesamte Material steht Dir vom ersten Moment an zur Verfügung.",
      },
      {
        question: "Wie lange habe ich Zugriff auf den Onlinekurs?",
        answer:
          "Du hast 1.5 Jahre lang Zugriff auf alle Module, Behandlungsvideos und Updates. Inhalte werden regelmäßig aktualisiert, neue Erkenntnisse, Studien und Behandlungsvideos kommen während Deiner Zugriffsdauer kostenfrei dazu.",
      },
      {
        question: "Welche CME-Punkte bekomme ich für den Botox-Onlinekurs?",
        answer:
          "Der Onlinekurs ist mit {cme_online} CME-Punkten von der Ärztekammer Berlin akkreditiert. Du sammelst die Punkte, indem Du den CME-Test am Ende jedes Kapitels erfolgreich abschließt. Die Punkte werden nach Abschluss in Dein Fortbildungskonto übertragen.",
      },
      {
        question: "Reicht der Onlinekurs allein, um Patient:innen zu behandeln?",
        answer:
          "Der Onlinekurs vermittelt Dir die komplette Theorie inklusive detaillierter Behandlungsvideos, Indikationsstellung, Anatomie und Komplikationsmanagement. Ob Du nach Abschluss bereit bist, eigene Patient:innen zu behandeln, hängt von Deinem persönlichen Sicherheitsempfinden, Deiner medizinischen Vorerfahrung und den berufsrechtlichen Vorgaben in Deiner Region ab.",
      },
      {
        question: "Muss ich approbierte Ärzt:in sein, um den Botox-Onlinekurs zu buchen?",
        answer:
          "Ja. Unser Botox-Onlinekurs richtet sich ausschließlich an approbierte Ärzt:innen. Diese Voraussetzung ist sowohl rechtlich als auch fachlich notwendig, da Botulinum in Deutschland verschreibungspflichtig ist und die sichere Anwendung medizinisches Grundwissen voraussetzt.",
      },
      {
        question: "Bekomme ich eine Rechnung für meinen Arbeitgeber?",
        answer:
          "Ja. Beim Checkout kannst Du eine Rechnungsadresse hinterlegen. Du bekommst die Rechnung automatisch per E-Mail. Auf Wunsch erstellen wir Dir auch eine Rechnung mit Praxis- oder Klinikadresse, schreib uns dafür einfach eine Nachricht an customerlove@ephia.de.",
      },
    ],
  },

  breadcrumbLabel: "Botox-Onlinekurs",
};
