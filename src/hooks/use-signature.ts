"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Builds an HTML email signature for the logged-in staff member from
// their `profiles` row (title + first_name + last_name). Matches the
// branded footer used in transactional emails (email-template.ts):
// closing line, EPHIA logo, company details.

const LOGO_URL =
  "https://lwfiles.mycourse.app/6638baeec5c56514e03ec360-public/f64a1ea1eb5346a171fe9ea36e8615ca.png";

export interface Signature {
  html: string;
  userName: string;
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
        // Short name for the closing: "Dr. Sophia", "Jana", "Marc", etc.
        const closingName = [profile.title, profile.first_name]
          .filter(Boolean)
          .join(" ") || "Dein EPHIA-Team";

        const html = `<div style="font-family:Arial,sans-serif;">
  <p style="margin:0 0 16px; font-size:14px; color:#333;">Herzliche Grüße,<br>${closingName}</p>
  <div style="padding-top:16px; border-top:1px solid #f0f0f0;">
    <img src="${LOGO_URL}" alt="EPHIA" style="width:160px; height:auto; display:block; margin:0 0 8px;">
    <div style="color:#9e9e9e; font-size:12px; line-height:1.5;">
      EPHIA Medical GmbH<br>
      Dorfstraße 30, 15913 Märkische Heide, Deutschland<br>
      Geschäftsführerin: Dr. Sophia Wilk-Vollmann
    </div>
  </div>
</div>`;

        setSignature({ html, userName: name || "EPHIA" });
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
