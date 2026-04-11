import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum — EPHIA",
  description:
    "Impressum der EPHIA Medical GmbH, Dorfstraße 30, 15913 Märkische Heide.",
  alternates: { canonical: "https://www.ephia.de/impressum" },
};

export default function ImpressumPage() {
  return (
    <article className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24 text-black">
      <h1 className="text-3xl md:text-4xl font-bold tracking-wide mb-10">
        IMPRESSUM
      </h1>

      <p className="text-base leading-relaxed mb-6">
        ephia.de ist ein Portal der EPHIA Medical GmbH.
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-2">Anschrift</h2>
        <p className="text-base leading-relaxed">
          EPHIA Medical GmbH
          <br />
          Dorfstraße 30
          <br />
          15913 Märkische Heide
          <br />
          Deutschland
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-2">Kontakt</h2>
        <p className="text-base leading-relaxed">
          <a
            href="mailto:customerlove@ephia.de"
            className="text-[#0066FF] hover:underline"
          >
            customerlove@ephia.de
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-2">Registereintrag</h2>
        <p className="text-base leading-relaxed">
          Handelsregister-Nummer: HRB 279383 B
          <br />
          Steuernummer: 049/108/01622
          <br />
          USt-IdNr: DE456748337
        </p>
      </section>
    </article>
  );
}
