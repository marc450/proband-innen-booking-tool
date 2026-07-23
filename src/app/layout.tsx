import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/cookie-consent";
import { GoogleAnalytics } from "@/components/google-analytics";

const roboto = Roboto({
  variable: "--font-sans",
  subsets: ["latin"],
  // 300 (light) is unused anywhere in the app; dropping it removes one
  // render-blocking font file from the critical path.
  weight: ["400", "500", "700"],
});

// Pinch-zoom stays enabled: maximumScale/userScalable were only ever
// here to stop iOS from zooming on input focus, and that is now handled
// properly by the 16px control floor in globals.css. Blocking zoom is a
// Lighthouse accessibility failure and hurts anyone reading clinical
// detail on a phone.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://ephia.de"),
  title: "EPHIA Booking",
  description: "Book your treatment slot for EPHIA aesthetic training courses",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "EPHIA",
    images: [
      {
        url: "/logos/ephia-logo.png",
        width: 2394,
        height: 589,
        alt: "EPHIA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/logos/ephia-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${roboto.variable} h-full antialiased scroll-smooth`}>
      <body className="min-h-full flex flex-col">
        {children}
        <GoogleAnalytics />
        <CookieConsent />
      </body>
    </html>
  );
}
