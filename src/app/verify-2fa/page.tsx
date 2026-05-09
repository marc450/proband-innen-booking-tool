import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { Verify2faForm } from "./verify-2fa-form";

// Post-login MFA challenge page. Reached via the middleware AAL gate
// when a user has a verified TOTP factor but the current session is
// still aal1 (password-only). After a correct code, the session
// upgrades to aal2 and the middleware lets them through to /dashboard.
export const metadata: Metadata = {
  title: "Bestätigen | EPHIA Staff",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function Verify2faPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <img
        src="/logo-centered.svg"
        alt="EPHIA by Dr. Sophia"
        className="w-48 mb-10"
      />
      <div className="w-full max-w-sm bg-white rounded-[10px] shadow-sm p-8">
        <h1 className="text-xl font-bold text-center text-black mb-2">
          Code eingeben
        </h1>
        <p className="text-sm text-black/70 mb-6 text-center">
          Bestätige Deinen Login mit dem 6-stelligen Code aus Deiner Authenticator-App.
        </p>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-[#0066FF]" />
            </div>
          }
        >
          <Verify2faForm />
        </Suspense>
      </div>
    </div>
  );
}
