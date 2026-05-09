import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { Setup2faForm } from "./setup-2fa-form";

// Forced TOTP enrollment for any staff member without a verified
// factor. Reached via the middleware AAL gate. Admins and nutzer
// alike cannot reach /dashboard until they enroll — every staff
// surface touches encrypted patient data, so 2FA is required for
// the whole staff dashboard.
export const metadata: Metadata = {
  title: "2FA einrichten | EPHIA Staff",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function Setup2faPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <img
        src="/logo-centered.svg"
        alt="EPHIA by Dr. Sophia"
        className="w-48 mb-10"
      />
      <div className="w-full max-w-md bg-white rounded-[10px] shadow-sm p-8">
        <h1 className="text-xl font-bold text-center text-black mb-2">
          Zwei-Faktor-Authentifizierung einrichten
        </h1>
        <p className="text-sm text-black/70 mb-6 text-center leading-relaxed">
          Bevor Du das Dashboard erreichst, musst Du einen zweiten Faktor
          einrichten. Das schützt Patient:innen-Daten zusätzlich zum Passwort.
        </p>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-[#0066FF]" />
            </div>
          }
        >
          <Setup2faForm />
        </Suspense>
      </div>
    </div>
  );
}
