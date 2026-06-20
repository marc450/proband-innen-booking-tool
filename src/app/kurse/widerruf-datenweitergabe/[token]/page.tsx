import type { Metadata } from "next";
import { WithdrawClient } from "./withdraw-client";

// Public, token-gated Widerruf landing for the Galderma data forwarding.
// Linked from the confirmation email. Served at
// ephia.de/widerruf-datenweitergabe/[token] via the marketing slug rewrite.
// Noindex: tokenized, per-person, must never be indexed.
export const metadata: Metadata = {
  title: "Einwilligung widerrufen | EPHIA",
  robots: { index: false, follow: false },
};

export default async function WiderrufDatenweitergabePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <article className="max-w-2xl mx-auto px-5 md:px-8 py-16 md:py-24 text-black">
      {/* Explicit arbitrary color, not text-black: the dashboard dark-mode
          utility remap (.dark .text-black) would otherwise flip this title
          to light on the rose marketing background. */}
      <h1 className="text-3xl md:text-4xl font-bold mb-2 text-[#111111]">
        Datenweitergabe an Galderma widerrufen
      </h1>
      <p className="text-sm text-black/60 mb-10">EPHIA Medical GmbH</p>
      <WithdrawClient token={token} />
    </article>
  );
}
