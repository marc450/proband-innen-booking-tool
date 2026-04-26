import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Header } from "./_components/header";
import { Footer } from "./_components/footer";

// Hosts that are allowed to be indexed by search engines. Every other
// host that serves the same Next.js app (kurse.ephia.de staging,
// admin.ephia.de, proband-innen.ephia.de, Railway preview URLs, etc.)
// gets a noindex meta tag so rankings stay concentrated on the
// canonical bare domain once it migrates from the old LearnWorlds site.
const INDEXABLE_HOSTS = new Set(["ephia.de", "www.ephia.de"]);

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers();
  const host = (hdrs.get("host") ?? "").split(":")[0].toLowerCase();

  if (INDEXABLE_HOSTS.has(host)) return {};

  return {
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
  };
}

export default function KurseLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAEBE1] text-black">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
