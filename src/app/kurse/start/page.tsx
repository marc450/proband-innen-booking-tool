import type { Metadata } from "next";
import { StartForm } from "./start-form";

// /start is the customer login surface on ephia.de. The middleware
// rewrites this URL to /kurse/start internally (so the page inherits
// the marketing layout — header, footer, brand colours) but the
// browser sees the clean URL.
//
// noindex because account-management pages have nothing to rank on
// and we don't want them showing up in search results.
export const metadata: Metadata = {
  title: "Anmelden | EPHIA",
  description:
    "Melde Dich mit Deiner E-Mail-Adresse bei EPHIA an, um auf Deine Kurse zuzugreifen.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://ephia.de/start" },
};

export default function StartPage() {
  return (
    <div className="min-h-[60vh] flex items-start justify-center px-5 md:px-8 pt-12 pb-24">
      <div className="w-full max-w-md">
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 text-center">
          Anmelden
        </h1>
        <p className="text-sm text-black/70 mb-8 text-center">
          Mit Deiner E-Mail-Adresse, die Du bei der Buchung Deines Kurses verwendet hast.
        </p>
        <StartForm />
      </div>
    </div>
  );
}
