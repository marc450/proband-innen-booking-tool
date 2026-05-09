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
        // Hard navigation instead of router.replace: forces a full
        // reload so middleware reads the freshly-rotated aal2 cookie.
        // router.replace was observably hanging on /verify-2fa for the
        // same reason (App Router cache / middleware-state race after
        // session cookie rotates), so we use window.location everywhere
        // we transition out of an MFA step-up.
        window.location.assign("/dashboard");
      }}
      onCancel={async () => {
        await supabase.auth.signOut();
        router.replace("/login");
      }}
    />
  );
}
