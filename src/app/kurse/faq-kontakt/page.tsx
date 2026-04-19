import type { Metadata } from "next";
import { Mail, Clock } from "lucide-react";
import { Faq } from "../_components/sections/faq";
import { ContactForm } from "./contact-form";
import { faqKontakt } from "@/content/kurse/faq-kontakt";

export const metadata: Metadata = {
  title: "FAQ & Kontakt — EPHIA",
  description:
    "Häufige Fragen zu unseren Kursen in ästhetischer Medizin (Botulinum, Dermalfiller, Biostimulation, Skinbooster) und direkter Kontakt zum EPHIA-Team.",
  alternates: { canonical: "https://kurse.ephia.de/kurse/faq-kontakt" },
};

export default function FaqKontaktPage() {
  // JSON-LD FAQ schema so Google can surface individual answers as rich
  // results on brand / product queries.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqKontakt.faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div>
      {/* Structured data for SEO — emits the same FAQ content as a
          machine-readable JSON-LD block so search engines can render
          rich results. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <section className="py-20 md:py-24 text-center">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-wide">
            FAQ &amp; KONTAKT
          </h1>
        </div>
      </section>

      {/* FAQ (reuses the existing course-page FAQ component so styling is
          identical across the site). */}
      <Faq content={faqKontakt.faq} />

      {/* Contact — split two-column on desktop, stacked on mobile. */}
      <section className="bg-[#e6e8ec] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-5 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold">Kontaktiere uns</h2>
            <div className="space-y-5 text-sm md:text-base">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#5e3a26] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold tracking-wider uppercase mb-1">
                    Unsere E-Mail
                  </p>
                  <a
                    href="mailto:customerlove@ephia.de"
                    className="text-black hover:text-[#0066FF] underline underline-offset-4"
                  >
                    customerlove@ephia.de
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#5e3a26] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold tracking-wider uppercase mb-1">
                    Unsere Erreichbarkeitszeiten
                  </p>
                  <p className="text-black">Montag – Freitag von 9.00 – 19.00 Uhr</p>
                </div>
              </div>
            </div>
          </div>

          <ContactForm />
        </div>
      </section>
    </div>
  );
}
