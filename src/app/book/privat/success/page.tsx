import { CheckCircle2 } from "lucide-react";

export default function PrivatSuccessPage() {
  return (
    <div className="min-h-screen bg-[#FAEBE1]">
      <header className="border-b border-black/10 bg-[#FAEBE1] h-[55px] flex items-center">
        <div className="max-w-3xl mx-auto px-5 md:px-8 w-full">
          <a href="https://ephia.de" target="_blank" rel="noopener noreferrer" className="inline-block">
            <img src="/logo.svg" alt="EPHIA" style={{ width: "203px", height: "auto" }} />
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 md:px-8 py-12">
        <div className="bg-white rounded-[10px] p-10 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Buchung erfolgreich!</h2>
          <p className="text-black/70">
            Dein Termin wurde erfolgreich gebucht. Du erhältst in Kürze eine Bestätigung per E-Mail.
          </p>
        </div>
      </main>
    </div>
  );
}
