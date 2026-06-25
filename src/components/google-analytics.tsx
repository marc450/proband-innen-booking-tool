"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { getCookieConsent } from "@/components/cookie-consent";

// Loads GA4 (gtag.js) ONLY after the user has accepted cookies. This honours
// the DSGVO / TTDSG consent requirement: no analytics cookie is written and
// no request to Google is made until consent === "accepted". The component
// reacts to the custom "ephia-consent-change" event dispatched by the cookie
// banner, so accepting flips GA on without a page reload.
//
// Renders nothing when NEXT_PUBLIC_GA4_MEASUREMENT_ID is unset, which keeps
// the whole feature a safe no-op until the env var is configured on Railway.

const GA_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

export function GoogleAnalytics() {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const sync = () => setAccepted(getCookieConsent() === "accepted");
    sync();
    window.addEventListener("ephia-consent-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ephia-consent-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!GA_ID || !accepted) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
