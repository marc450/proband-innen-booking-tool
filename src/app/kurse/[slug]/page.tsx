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
import { LocationInfo } from "../_components/sections/location-info";
import { LearningPath } from "../_components/sections/learning-path";
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
      canonical: `https://kurse.ephia.de/kurse/${content.slug}`,
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

  // Some courses share Praxiskurs sessions with another template
  // (e.g. Zahnmedizin uses the same dates as Humanmedizin Botulinum).
  const SESSION_SHARING: Record<string, string> = {
    grundkurs_botulinum_zahnmedizin: "grundkurs_botulinum",
  };

  let sessionTemplateId = template.id;
  const sharedKey = SESSION_SHARING[content.courseKey];
  if (sharedKey) {
    const { data: sharedTemplate } = await supabase
      .from("course_templates")
      .select("id")
      .eq("course_key", sharedKey)
      .single();
    if (sharedTemplate) sessionTemplateId = sharedTemplate.id;
  }

  // Fetch live sessions
  const { data: sessions } = await supabase
    .from("course_sessions")
    .select("*")
    .eq("template_id", sessionTemplateId)
    .eq("is_live", true)
    .order("date_iso", { ascending: true });

  // Template-token substitution. Lets content files reference live
  // template values (e.g. `{cme_online}` in the hero subheadline) so a
  // CME number bump in Supabase auto-updates everywhere it's quoted.
  // course_templates.cme_online stores values like "10 CME" (string,
  // suffix included). Tokens resolve to the leading number only so
  // content templates can append units freely (e.g.
  // "{cme_online} CME-Punkten" → "10 CME-Punkten").
  const cmeNumber = (raw: string | null): string | null => {
    if (raw == null) return null;
    const m = String(raw).match(/\d+/);
    return m ? m[0] : null;
  };
  const tokens: Record<string, string> = {};
  const cmeOnlineNum = cmeNumber(template.cme_online);
  if (cmeOnlineNum != null) tokens["{cme_online}"] = cmeOnlineNum;
  const cmeKombiNum = cmeNumber(template.cme_kombi);
  if (cmeKombiNum != null) tokens["{cme_kombi}"] = cmeKombiNum;
  const sub = (s: string): string => {
    let out = s;
    for (const [k, v] of Object.entries(tokens)) {
      out = out.split(k).join(v);
    }
    return out;
  };
  const heroContent = {
    ...content.hero,
    subheadline: content.hero.subheadline ? sub(content.hero.subheadline) : undefined,
    description: sub(content.hero.description),
    stats: content.hero.stats?.map((s) => ({ ...s, value: sub(s.value) })),
  };
  const faqContent = {
    ...content.faq,
    items: content.faq.items.map((item) => ({
      ...item,
      answer: sub(item.answer),
    })),
  };

  // JSON-LD Course schema (+ hasCourseInstance per session) for Google Search
  // https://developers.google.com/search/docs/appearance/structured-data/course
  // Marketing /kurse/* pages are canonically served from kurse.ephia.de,
  // not the staff/booking subdomains.
  const siteUrl = "https://kurse.ephia.de";
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
    // One instance per live Praxiskurs session. Suppressed on
    // online-only landing pages so Google doesn't see Praxis dates the
    // page itself doesn't surface.
    ...(content.hideBookingWidget ? [] : liveSessions).map((s) => ({
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

  // BreadcrumbList JSON-LD — helps Google render the breadcrumb trail
  // and gives AI search clearer hierarchy signals.
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "EPHIA",
        item: "https://ephia.de",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Kurse",
        item: `${siteUrl}/kurse`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: content.breadcrumbLabel || content.meta.title,
        item: courseUrl,
      },
    ],
  };

  // FAQPage JSON-LD — only when the page actually has FAQ items.
  const faqJsonLd =
    faqContent.items.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqContent.items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null;

  // LocalBusiness JSON-LD — only when the landing has a `location`
  // block (city-targeted pages like Botox-Kurs Berlin).
  const localBusinessJsonLd = content.location
    ? {
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        name: `EPHIA — ${content.location.venueName}`,
        url: courseUrl,
        address: {
          "@type": "PostalAddress",
          streetAddress: content.location.street,
          postalCode: content.location.postalCode,
          addressLocality: content.location.city,
          addressCountry: content.location.country || "DE",
        },
        ...(content.location.geo
          ? {
              geo: {
                "@type": "GeoCoordinates",
                latitude: content.location.geo.latitude,
                longitude: content.location.geo.longitude,
              },
            }
          : {}),
      }
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output is trusted — no user input flows in here
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      {localBusinessJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
      )}
      <Hero
        content={heroContent}
        // When the hero CTA fires a direct Stripe checkout, append the
        // Onlinekurs price to the button label so users see the cost
        // before they click (matches the booking-widget cards' price UX).
        priceSuffix={
          content.hero.ctaOverride?.directCheckoutCourseKey && template.price_gross_online
            ? `EUR ${template.price_gross_online.toLocaleString("de-DE")}`
            : undefined
        }
      />
      <Lernziele content={content.lernziele} />
      {!content.hideBookingWidget && (
        <CourseCardsPage template={template} sessions={sessions ?? []} />
      )}
      {content.location && <LocationInfo content={content.location} />}
      {content.learningPath && <LearningPath content={content.learningPath} />}
      {/* Pure-online courses skip the Gruppenbuchungen pitch — group
          discounts only make sense when there's an onsite Praxiskurs. */}
      {!content.hideBookingWidget && (
        <Gruppenbuchungen
          content={content.gruppenbuchungen}
          courseTitle={content.hero.heading}
        />
      )}
      <Inhalt content={content.inhalt} />
      {content.inhaltOnline && <Inhalt content={content.inhaltOnline} />}
      {/* Practical-only courses (no Onlinekurs) have no e-learning
          platform to show off — skip the Lernplattform section when no
          features are configured. */}
      {content.lernplattform.features.length > 0 && (
        <Lernplattform content={content.lernplattform} />
      )}
      <CtaBanner
        content={content.ctaBanner}
        priceSuffix={
          content.ctaBanner.directCheckoutCourseKey && template.price_gross_online
            ? `EUR ${template.price_gross_online.toLocaleString("de-DE")}`
            : undefined
        }
      />
      <Testimonials content={content.testimonials} />
      <Faq content={faqContent} />
    </>
  );
}
