import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCourseContent, getAllCourseSlugs } from "@/content/kurse";

import { Hero } from "../_components/sections/hero";
import { Lernziele } from "../_components/sections/lernziele";
import { Gruppenbuchungen } from "../_components/sections/gruppenbuchungen";
import { Inhalt } from "../_components/sections/inhalt";
import { Lernplattform } from "../_components/sections/lernplattform";
import { CtaBanner } from "../_components/sections/cta-banner";
import { Testimonials } from "../_components/sections/testimonials";
import { Faq } from "../_components/sections/faq";
import { StickyMobileCta } from "../_components/sections/sticky-mobile-cta";
import { CourseCardsPage } from "../_components/widget/course-cards-page";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return getAllCourseSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const content = getCourseContent(slug);
  if (!content) return { title: "EPHIA" };

  return {
    title: content.meta.title,
    description: content.meta.description,
    openGraph: {
      title: content.meta.title,
      description: content.meta.description,
      type: "website",
      siteName: "EPHIA",
      locale: "de_DE",
      ...(content.meta.ogImage ? { images: [content.meta.ogImage] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: content.meta.title,
      description: content.meta.description,
      ...(content.meta.ogImage ? { images: [content.meta.ogImage] } : {}),
    },
    alternates: {
      canonical: `/kurse/${content.slug}`,
    },
  };
}

export default async function KursPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const content = getCourseContent(slug);
  if (!content) return notFound();

  const supabase = createAdminClient();

  // Fetch course template by the same course_key the live widget uses
  const { data: template } = await supabase
    .from("course_templates")
    .select("*")
    .eq("course_key", content.courseKey)
    .eq("status", "live")
    .single();

  if (!template) return notFound();

  // Fetch live sessions
  const { data: sessions } = await supabase
    .from("course_sessions")
    .select("*")
    .eq("template_id", template.id)
    .eq("is_live", true)
    .order("date_iso", { ascending: true });

  // JSON-LD Course schema (+ hasCourseInstance per session) for Google Search
  // https://developers.google.com/search/docs/appearance/structured-data/course
  const siteUrl = "https://proband-innen.ephia.de";
  const courseUrl = `${siteUrl}/kurse/${content.slug}`;
  const priceCurrency = "EUR";
  const liveSessions = (sessions ?? []).filter((s) => s.is_live);

  const hasCourseInstance = [
    // An evergreen online instance (uses the Onlinekurs price if set)
    ...(template.price_gross_online
      ? [
          {
            "@type": "CourseInstance",
            courseMode: "Online",
            courseWorkload: "PT10H",
            inLanguage: "de",
            offers: {
              "@type": "Offer",
              price: String(template.price_gross_online),
              priceCurrency,
              availability: "https://schema.org/InStock",
              url: courseUrl,
            },
          },
        ]
      : []),
    // One instance per live Praxiskurs session
    ...liveSessions.map((s) => ({
      "@type": "CourseInstance",
      courseMode: "Onsite",
      startDate: s.date_iso,
      ...(s.address ? { location: { "@type": "Place", name: s.address } } : {}),
      inLanguage: "de",
      ...(template.price_gross_praxis || template.price_gross_kombi
        ? {
            offers: {
              "@type": "Offer",
              price: String(template.price_gross_kombi ?? template.price_gross_praxis),
              priceCurrency,
              availability:
                s.booked_seats < s.max_seats
                  ? "https://schema.org/InStock"
                  : "https://schema.org/SoldOut",
              url: courseUrl,
            },
          }
        : {}),
    })),
  ];

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: content.meta.title,
    description: content.meta.description,
    url: courseUrl,
    provider: {
      "@type": "Organization",
      name: "EPHIA",
      url: "https://ephia.de",
    },
    ...(hasCourseInstance.length > 0 ? { hasCourseInstance } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output is trusted — no user input flows in here
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <Hero content={content.hero} />
      <Lernziele content={content.lernziele} />
      <CourseCardsPage template={template} sessions={sessions ?? []} />
      <Gruppenbuchungen
        content={content.gruppenbuchungen}
        courseTitle={content.hero.heading}
      />
      <Inhalt content={content.inhalt} />
      <Lernplattform content={content.lernplattform} />
      <CtaBanner content={content.ctaBanner} />
      <Testimonials content={content.testimonials} />
      <Faq content={content.faq} />
      <StickyMobileCta label={content.hero.heading} targetId="kursangebote" />
    </>
  );
}
