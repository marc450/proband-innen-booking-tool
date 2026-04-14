"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle, ClipboardList, Loader2 } from "lucide-react";

const TITLE_OPTIONS = ["Dr. med.", "Dr. med. dent.", "Prof. Dr.", "PD Dr.", "Kein Titel"];
const GENDER_OPTIONS = ["Weiblich", "Männlich", "Divers"];
const SPECIALTIES = [
  "Allgemeinmedizin", "Anatomie", "Anästhesiologie", "Arbeitsmedizin",
  "Augenheilkunde", "Chirurgie", "Dermatologie", "Gynäkologie",
  "Hals-Nasen-Ohrenkunde", "Humangenetik", "Hygiene- und Umweltmedizin",
  "Hämatologie", "Innere Medizin", "Kardiologie", "Kinder- und Jugendmedizin",
  "Kinder- und Jugendpsychiatrie und -psychotherapie",
  "Mund-Kiefer-Gesichtschirurgie", "Neurochirurgie", "Neurologie",
  "Nuklearmedizin", "Onkologie", "Orthopädie",
  "Öffentliches Gesundheitswesen", "Pathologie", "Pharmakologie",
  "Phoniatrie und Pädaudiologie", "Physikalische und Rehabilitative Medizin",
  "Physiologie", "Psychiatrie und Psychotherapie",
  "Psychosomatische Medizin und Psychotherapie", "Radiologie",
  "Rechtsmedizin", "Strahlentherapie", "Transfusionsmedizin",
  "Urologie", "Unfallchirurgie", "Zahnmedizin",
];

interface BookingInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  courseType: string;
  templateId: string;
  sessionId: string | null;
  amountPaid: number;
  audienceTag: string;
  auszubildendeId: string | null;
}

interface Props {
  booking: BookingInfo | null;
  profileComplete: boolean;
}

export function SuccessContent({ booking, profileComplete }: Props) {
  const [title, setTitle] = useState("");
  const [gender, setGender] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [efn, setEfn] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(profileComplete);
  const [error, setError] = useState("");
  const reminderSentRef = useRef(false);

  // Send reminder email when user closes/leaves page without completing profile
  // Uses beforeunload only (not visibilitychange which fires too eagerly on redirects)
  // Minimum 30s on page before the reminder can fire to avoid false triggers
  useEffect(() => {
    if (!booking || profileComplete || done) return;

    const mountedAt = Date.now();

    const triggerReminder = () => {
      if (reminderSentRef.current || done) return;
      // Don't fire if user has been on the page less than 30 seconds
      if (Date.now() - mountedAt < 30_000) return;
      reminderSentRef.current = true;
      const payload = JSON.stringify({ bookingId: booking.id, email: booking.email });
      navigator.sendBeacon("/api/send-profile-reminder", payload);
    };

    window.addEventListener("beforeunload", triggerReminder);

    return () => {
      window.removeEventListener("beforeunload", triggerReminder);
    };
  }, [booking, profileComplete, done]);

  // Auto-reload when booking hasn't arrived yet (webhook race condition).
  // Tries every 3s for up to 30s, then stops and shows manual reload.
  // Uses sessionStorage to persist retry count across page reloads.
  useEffect(() => {
    if (booking) {
      sessionStorage.removeItem("profile_retry_count");
      return;
    }
    const retries = parseInt(sessionStorage.getItem("profile_retry_count") || "0", 10);
    if (retries >= 10) return;
    const timer = setTimeout(() => {
      sessionStorage.setItem("profile_retry_count", String(retries + 1));
      window.location.reload();
    }, 3000);
    return () => clearTimeout(timer);
  }, [booking]);

  // Booking not found yet (webhook may not have fired)
  if (!booking) {
    return (
      <div className="bg-white rounded-[10px] p-8 text-center shadow-sm">
        <Loader2 className="w-10 h-10 text-[#0066FF] animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-black mb-2">Deine Buchung wird verarbeitet...</h2>
        <p className="text-gray-600 text-sm mb-4">
          Bitte warte einen Moment, die Seite aktualisiert sich automatisch.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-[#0066FF] font-semibold text-sm underline"
        >
          Seite neu laden
        </button>
      </div>
    );
  }

  // Profile already complete — show thank-you
  if (done) {
    return (
      <div className="bg-white rounded-[10px] p-8 text-center shadow-sm">
        <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-black mb-3">Vielen Dank für Deine Buchung!</h2>
        <p className="text-gray-700 mb-6 leading-relaxed">
          Bitte erstelle ein Passwort für Deinen EPHIA-Account um mit Deinem Kurs zu starten.
          Ein entsprechender Link wurde Dir per E-Mail zugestellt.
        </p>
        <p className="text-gray-700 mb-6 leading-relaxed">
          Wenn Du bereits einen Account bei uns hast, dann kannst Du Dich direkt einloggen und mit dem Lernen beginnen.
        </p>
        <a
          href="https://www.ephia.de/start"
          className="inline-block bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-lg py-3.5 px-8 rounded-[10px] transition-colors"
        >
          Zum Login
        </a>
      </div>
    );
  }

  const isZahnmedizin = specialty === "Zahnmedizin";
  const efnRequired = specialty !== "" && !isZahnmedizin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !gender || !specialty || !birthdate) {
      setError("Bitte fülle alle Pflichtfelder aus.");
      return;
    }
    if (efnRequired && !efn) {
      setError("Bitte gib Deine EFN ein.");
      return;
    }
    if (efn && !/^\d{15}$/.test(efn)) {
      setError("Die EFN muss genau 15 Ziffern haben.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          email: booking.email,
          title,
          gender,
          specialty,
          birthdate,
          efn: efn || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ein Fehler ist aufgetreten.");
        return;
      }

      setDone(true);
    } catch {
      setError("Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[10px] p-8 shadow-sm">
      <ClipboardList className="w-10 h-10 text-[#0066FF] mx-auto mb-2" />
      <h2 className="text-xl font-bold text-black text-center mb-1">Noch ein Schritt!</h2>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-amber-800 text-sm text-center font-medium">
          ⚠️ Bitte schließe dieses Fenster noch nicht! Wir benötigen noch ein paar Angaben, um Deinen Kurs freizuschalten.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Titel *</label>
          <select
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-[10px] px-3 py-2.5 text-sm text-black focus:outline-none focus:border-[#0066FF] bg-white"
          >
            <option value="">Bitte wählen...</option>
            {TITLE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Geschlecht *</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-[10px] px-3 py-2.5 text-sm text-black focus:outline-none focus:border-[#0066FF] bg-white"
          >
            <option value="">Bitte wählen...</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Specialty */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Fachrichtung *</label>
          <select
            value={specialty}
            onChange={(e) => { setSpecialty(e.target.value); if (e.target.value === "Zahnmedizin") setEfn(""); }}
            required
            className="w-full border border-gray-200 rounded-[10px] px-3 py-2.5 text-sm text-black focus:outline-none focus:border-[#0066FF] bg-white"
          >
            <option value="">Fachbereich aussuchen...</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Birthdate */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Geburtsdatum *</label>
          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-[10px] px-3 py-2.5 text-sm text-black focus:outline-none focus:border-[#0066FF]"
          />
        </div>

        {/* EFN — conditional */}
        {specialty !== "" && !isZahnmedizin && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              EFN (Einheitliche Fortbildungsnummer) *
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{15}"
              maxLength={15}
              value={efn}
              onChange={(e) => setEfn(e.target.value.replace(/\D/g, ""))}
              placeholder="15-stellige Nummer"
              required
              className="w-full border border-gray-200 rounded-[10px] px-3 py-2.5 text-sm text-black focus:outline-none focus:border-[#0066FF]"
            />
            <p className="text-xs text-gray-400 mt-1">Du findest Deine EFN auf Deinem Arztausweis.</p>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base py-3.5 rounded-[10px] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Wird gespeichert...
            </>
          ) : (
            "Profil speichern & Kurs freischalten"
          )}
        </button>
      </form>
    </div>
  );
}
