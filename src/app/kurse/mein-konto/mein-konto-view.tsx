"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Client view for /mein-konto. Lightweight v1 — list of past bookings
// + sign-out. The richer features (LW progress, certificates,
// click-to-launch SSO, basket UI) ship in follow-up commits once we've
// verified the auth flow end-to-end.

interface LegacyBookingRow {
  id: string;
  product_name: string;
  course_date: string | null;
  purchased_at: string | null;
  source: string;
}

interface Props {
  firstName: string | null;
  email: string;
  legacyBookings: LegacyBookingRow[];
}

function sourceLabel(source: string) {
  if (source.startsWith("lw_export")) return "Online-Kurs";
  if (source.startsWith("hubspot_deals")) return "Praxis / Kombi";
  return source;
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function MeinKontoView({ firstName, email, legacyBookings }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="min-h-[60vh] px-5 md:px-8 pt-12 pb-24">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-black">
              Hallo {firstName ?? "Du"}
            </h1>
            <p className="text-sm text-black/70 mt-1">
              Eingeloggt als <span className="font-medium text-black">{email}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-black/70 hover:text-black flex items-center gap-1.5 mt-1.5"
            title="Abmelden"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Abmelden</span>
          </button>
        </div>

        <h2 className="text-lg font-bold text-black mt-10 mb-4">
          Deine Kurse
        </h2>
        {legacyBookings.length === 0 ? (
          <div className="bg-white rounded-[10px] shadow-sm p-6 text-center text-sm text-black/70">
            Wir haben aktuell keine Kursbuchungen unter dieser E-Mail.
          </div>
        ) : (
          <ul className="space-y-3">
            {legacyBookings.map((b) => (
              <li
                key={b.id}
                className="bg-white rounded-[10px] shadow-sm p-5 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-black truncate">
                    {b.product_name}
                  </p>
                  <p className="text-xs text-black/60 mt-1">
                    {sourceLabel(b.source)}
                    {b.course_date && (
                      <> · Kursdatum: {formatDate(b.course_date)}</>
                    )}
                    {!b.course_date && b.purchased_at && (
                      <> · Gekauft: {formatDate(b.purchased_at)}</>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-black/50 mt-10 text-center">
          Die direkte Kurs-Anzeige und Lernfortschritt aus LearnWorlds folgen in den nächsten Tagen.
        </p>
      </div>
    </div>
  );
}
