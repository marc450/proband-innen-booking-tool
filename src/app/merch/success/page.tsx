import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "EPHIA Merch · Danke!" };

export default async function MerchSuccessPage() {
  return (
    <div className="min-h-screen bg-[#FAEBE1] flex items-center justify-center px-5 py-12">
      <div className="max-w-lg w-full bg-white rounded-[10px] shadow-sm p-8 md:p-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-5">
          <CheckCircle2 className="w-7 h-7 text-emerald-700" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-3">Vielen Dank für Deine Bestellung!</h1>
        <p className="text-sm md:text-base text-black/75 mb-6">
          Wir haben Deine Zahlung erhalten und senden Dir gleich eine Bestätigung
          per E-Mail. Deine Cap geht in den nächsten 3–7 Werktagen auf den Weg zu Dir.
        </p>
        <p className="text-sm text-black/60 mb-6">
          Mit Deinem Kauf unterstützt Du die Jenny De la Torre-Stiftung mit 10 €.
          Danke, dass Du dabei bist.
        </p>
        <Link
          href="/merch"
          className="inline-block bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold rounded-[10px] px-6 py-3 transition-colors"
        >
          Zurück zum Shop
        </Link>
      </div>
    </div>
  );
}
