import type { Metadata } from "next";
import type { ReactNode } from "react";

// The private booking funnel is only meant to be reached via emailed
// links sent to referring doctors. Belt-and-braces noindex:
//   - this metadata sets the <meta name="robots" content="noindex,nofollow">
//     tag on every page under /book/privat
//   - middleware sets the X-Robots-Tag header on the same paths
//   - robots.ts disallows the entire booking host
// Three independent blockers so a single misconfiguration can't leak the
// funnel into Google.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function PrivatLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
