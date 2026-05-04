// "EPHIA hilft" donation block. Renders the same copy on the /merch
// index and every /merch/[slug] product page so the message stays
// consistent: every Euro from merch sales goes to the Jenny De la
// Torre-Stiftung. Previously this block was inlined on the cap detail
// page only, with a per-cap "10 €" claim that no longer reflects how
// the program actually works.

export function EphiaHilft() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="max-w-3xl mx-auto px-5 md:px-8 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#0066FF]/10">
          <svg
            className="w-7 h-7 text-[#0066FF]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z"
            />
          </svg>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold">EPHIA hilft</h2>
        <div className="text-black/75 text-base md:text-lg leading-relaxed space-y-4 text-left md:text-center">
          <p>
            In Berlin leben mehrere Tausend Menschen ohne festen Wohnsitz. Mit
            der Dauer der Obdachlosigkeit nehmen gesundheitliche Probleme,
            chronische Erkrankungen und soziale Verwahrlosung stetig zu. Für
            viele Betroffene ist der Zugang zum regulären Gesundheitssystem mit
            hohen Hürden verbunden oder faktisch nicht möglich.
          </p>
          <p>
            Deshalb spenden wir den gesamten Erlös aus dem Verkauf unserer
            Merch-Artikel an die{" "}
            <a
              href="https://www.delatorre-stiftung.de"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0066FF] underline underline-offset-4"
            >
              Jenny De la Torre-Stiftung
            </a>
            .
          </p>
          <p className="font-semibold">
            Mit jedem Kauf trägst Du dazu bei, diese Arbeit zu unterstützen.
          </p>
        </div>
      </div>
    </section>
  );
}
