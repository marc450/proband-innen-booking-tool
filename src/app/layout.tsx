import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/cookie-consent";

const roboto = Roboto({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <CookieConsent />
      </body>
    </html>
  );
}
