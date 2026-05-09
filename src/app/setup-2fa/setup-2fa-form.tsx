"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TotpEnroller } from "@/components/2fa/totp-enroller";

// Wraps the shared TotpEnroller for the forced-enrollment context.
// onCancel here means "log me out" — the user can't dismiss without
// either enrolling or signing out, since the dashboard is gated.

export function Setup2faForm() {
  const router = useRouter();
  const supabase = createClient();

  return (
    <TotpEnroller
      onSuccess={() => {
        // After verification, session is aal2 and middleware lets the
        // user through to /dashboard. router.replace avoids leaving
        // /setup-2fa in history.
        router.replace("/dashboard");
      }}
      onCancel={async () => {
        await supabase.auth.signOut();
        router.replace("/login");
      }}
    />
  );
}
