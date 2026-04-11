import type { Metadata } from "next";
import { homeContent } from "@/content/kurse/home";

import { HomeHero } from "./_components/sections/home/hero";
import { WerWirSind } from "./_components/sections/home/wer-wir-sind";
import { UnsereKurse } from "./_components/sections/home/unsere-kurse";
import { UnserFokus } from "./_components/sections/home/unser-fokus";
import { InstagramFeed } from "./_components/sections/home/instagram-feed";
import { Testimonials } from "./_components/sections/testimonials";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: homeContent.meta.title,
  description: homeContent.meta.description,
  openGraph: {
    title: homeContent.meta.title,
    description: homeContent.meta.description,
    type: "website",
    siteName: "EPHIA",
    locale: "de_DE",
    ...(homeContent.meta.ogImage ? { images: [homeContent.meta.ogImage] } : {}),
  },
  twitter: {
    card: "summary_large_image",
    title: homeContent.meta.title,
    description: homeContent.meta.description,
    ...(homeContent.meta.ogImage ? { images: [homeContent.meta.ogImage] } : {}),
  },
  alternates: {
    canonical: "https://www.ephia.de/",
  },
};

export default function HomePage() {
  return (
    <>
      <HomeHero content={homeContent.hero} />
      <WerWirSind content={homeContent.werWirSind} />
      <UnsereKurse content={homeContent.courses} />
      <UnserFokus content={homeContent.fokus} />
      <Testimonials content={homeContent.testimonials} />
      <InstagramFeed content={homeContent.instagram} />
    </>
  );
}
