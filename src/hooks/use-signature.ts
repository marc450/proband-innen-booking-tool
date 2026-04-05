"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Builds an HTML email signature for the logged-in staff member from
// their `profiles` row (title + first_name + last_name). Shared by every
// composer in the admin panel so the inbox reply box, the inbox "Neue
// E-Mail" pane, and the inline composer on the Ärzt:in/Patient:in
// profile cards all sign off the same way.
//
// Returns null while the fetch is in flight or if the user has no
// profile row (e.g. first deploy before profile is created) — callers
// should fall back to an empty string in that case.

export interface Signature {
  html: string;
}

export function useSignature(): Signature | null {
  const [signature, setSignature] = useState<Signature | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, title")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled || !profile) return;
        const name = [profile.title, profile.first_name, profile.last_name]
          .filter(Boolean)
          .join(" ");
        const html = `<div style="color:#6b7280;font-size:13px;">Viele Grüße<br>${
          name || "Dein EPHIA Team"
        }<br>EPHIA · customerlove@ephia.de</div>`;
        setSignature({ html });
      } catch {
        // Silently skip — signature is a nice-to-have.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return signature;
}
