import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { ResetPasswordForm } from "./reset-password-form";

// Landing page for the "Passwort vergessen" recovery email link.
// The Supabase recovery URL bounces here with a `?code=...` query
// param; the client component below exchanges it for a session and
// shows the new-password form.
//
// Middleware rewrites kurse.ephia.de/reset-password and ephia.de/reset-password
// to this route via the standard /kurse/{slug} mapping, so the user
// sees a clean URL without "/kurse/" in it.
export const metadata: Metadata = {
  title: "Passwort zurücksetzen | EPHIA",
  description: "Setze ein neues Passwort für Dein EPHIA-Konto.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://ephia.de/reset-password" },
};

// useSearchParams() inside ResetPasswordForm forces this page to opt
// out of static prerendering. Force-dynamic is the explicit way to
// say "don't try to statically generate me" — recovery links are
// always per-request anyway.
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[60vh] flex items-start justify-center px-5 md:px-8 pt-12 pb-24">
      <div className="w-full max-w-md">
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 text-center">
          Neues Passwort setzen
        </h1>
        <p className="text-sm text-black/70 mb-8 text-center">
          Wähle ein neues Passwort für Dein EPHIA-Konto.
        </p>
        <Suspense
          fallback={
            <div className="bg-white rounded-[10px] shadow-sm p-6 md:p-8 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#0066FF]" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
