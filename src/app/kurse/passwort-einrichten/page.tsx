import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { SetupPasswordForm } from "./set-password-form";

// Landing page for the set-password token link that ships in the course
// confirmation email (and the /start resend). The token in `?token=...`
// is validated server-side; the client form below sets the password and
// signs the doctor in.
//
// Middleware rewrites ephia.de/passwort-einrichten to this route via the
// standard /kurse/{slug} mapping, so the user sees a clean URL.
export const metadata: Metadata = {
  title: "Passwort einrichten | EPHIA",
  description: "Richte Dein Passwort für Dein EPHIA-Konto ein.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://ephia.de/passwort-einrichten" },
};

// useSearchParams() inside the form opts this page out of static
// prerendering; the token link is always per-request anyway.
export const dynamic = "force-dynamic";

export default function PasswortEinrichtenPage() {
  return (
    <div className="min-h-[60vh] flex items-start justify-center px-5 md:px-8 pt-12 pb-24">
      <div className="w-full max-w-md">
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 text-center">
          Passwort einrichten
        </h1>
        <p className="text-sm text-black/70 mb-8 text-center">
          Lege ein Passwort für Dein EPHIA-Konto fest, um auf Deine Kurse zuzugreifen.
        </p>
        <Suspense
          fallback={
            <div className="bg-white rounded-[10px] shadow-sm p-6 md:p-8 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#0066FF]" />
            </div>
          }
        >
          <SetupPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
