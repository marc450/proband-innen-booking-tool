import type { ReactNode } from "react";
import { Header } from "../kurse/_components/header";
import { Footer } from "../kurse/_components/footer";

// Wrap the merch tree in the same chrome as /kurse (shared header + footer,
// beige background, same typography system) so the shop feels like a first-
// class part of kurse.ephia.de rather than a detached mini-site.
export default function MerchLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAEBE1] text-black">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
