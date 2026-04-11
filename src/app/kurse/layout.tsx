import type { ReactNode } from "react";
import { Header } from "./_components/header";
import { Footer } from "./_components/footer";

export default function KurseLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAEBE1] text-black">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
