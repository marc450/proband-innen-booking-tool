import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { ResetPasswordForm } from "./reset-password-form";

// Admin host (admin.ephia.de) reset-password landing page. Reached
// via the recovery email link minted by /api/admin/request-password-reset.
//
// Customer-facing reset (ephia.de/reset-password) is a separate route
// at src/app/kurse/reset-password/, served via the marketing-host slug
// rewrite. This page only renders on admin.ephia.de — on the marketing
// host, /reset-password is rewritten to /kurse/reset-password before
// it ever reaches the file router.
export const metadata: Metadata = {
  title: "Passwort zurücksetzen | EPHIA Staff",
  robots: { index: false, follow: false },
};

// useSearchParams() inside ResetPasswordForm forces this page to opt
// out of static prerendering. force-dynamic is the explicit way to
// say "don't try to statically generate me" — recovery links are
// always per-request anyway.
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <img
        src="/logo-centered.svg"
        alt="EPHIA by Dr. Sophia"
        className="w-48 mb-10"
      />
      <div className="w-full max-w-sm bg-white rounded-[10px] shadow-sm p-8">
        <h1 className="text-xl font-bold text-center text-black mb-2">
          Neues Passwort setzen
        </h1>
        <p className="text-sm text-black/70 mb-6 text-center">
          Wähle ein neues Passwort für Dein EPHIA-Staff-Konto.
        </p>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-6">
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
