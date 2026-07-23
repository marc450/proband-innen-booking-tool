"use client";

import { useState } from "react";
import { Info } from "lucide-react";

// UWG-Herkunftshinweis, gefaltet in ein Info-Icon neben der
// "verifizierte Bewertungen"-Zeile. Seit der UWG-Novelle muss angegeben
// werden, ob und wie sichergestellt wird, dass Bewertungen von echten
// Kund:innen stammen. Der Hinweis bleibt damit auf jeder Seite präsent
// (Hover + Fokus + Tap), ohne die Sektion mit einem Fließtext-Absatz zu
// überladen.
export function VerifiedInfo() {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label="Wie wir Bewertungen verifizieren"
        aria-expanded={open}
        className="inline-flex items-center justify-center text-black/40 hover:text-[#0066FF] focus:text-[#0066FF] focus:outline-none transition-colors"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        <Info className="h-4 w-4" />
      </button>

      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-[10px] bg-white px-4 py-3 text-left text-xs font-normal leading-relaxed text-black/70 shadow-lg"
        >
          Bewertungen können nur Ärzt:innen abgeben, die bei uns einen Kurs
          besucht haben. Den Bewertungslink verschicken wir persönlich, eine
          anonyme Abgabe ist nicht möglich. Als „Verifiziert“ markierte
          Bewertungen sind eindeutig einer Teilnehmer:in in unserem System
          zugeordnet.
        </span>
      )}
    </span>
  );
}
