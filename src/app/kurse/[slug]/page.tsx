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
import { ProseSection } from "../_components/sections/prose-section";
import { RelatedCourses } from "../_components/sections/related-courses";
import { Reviews, type PublicReview } from "../_components/sections/reviews";
import { CourseCardsPage } from "../_components/widget/course-cards-page";

// Slug-gate: only this landing surfaces the Reviews section + the
// AggregateRating/Review JSON-LD. Marc wants to test SERP rich-results
// on a single high-traffic page before rolling out broadly.
const REVIEWS_ENABLED_SLUGS = new Set<string>(["botox-kurs-fuer-aerzte"]);

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
      canonical: `https://ephia.de/${content.slug}`,
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

  // Public reviews — only fetched on slugs that opt in (see
  // REVIEWS_ENABLED_SLUGS above). Marc decided to surface ALL published
  // reviews on this page (not just the ones tied to the current
  // template), so the carousel reads cross-course feedback as one
  // signal.
  //
  // Display name composition: first_name comes from the review itself
  // (the doctor typed it on the form, signalling intent to publish),
  // while title + last-name initial are derived from the linked
  // auszubildende record. We don't ask the reviewer to retype data the
  // booking already has. Cards fall back to first_name only when no
  // auszubildende row is linked.
  //
  // The course_template join gives each card a "Bewertung zum Kurs X"
  // line so readers know which course was rated.
  type ReviewRow = {
    id: string;
    rating: number;
    first_name: string;
    body_text: string | null;
    submitted_at: string;
    display_title: string | null;
    display_last_initial: string | null;
    course_bookings:
      | {
          auszubildende:
            | { title: string | null; last_name: string | null }
            | { title: string | null; last_name: string | null }[]
            | null;
        }
      | {
          auszubildende:
            | { title: string | null; last_name: string | null }
            | { title: string | null; last_name: string | null }[]
            | null;
        }[]
      | null;
    auszubildende:
      | { title: string | null; last_name: string | null }
      | { title: string | null; last_name: string | null }[]
      | null;
    course_templates:
      | { course_label_de: string | null; title: string | null }
      | { course_label_de: string | null; title: string | null }[]
      | null;
  };
  let publicReviews: PublicReview[] = [];
  if (REVIEWS_ENABLED_SLUGS.has(content.slug)) {
    const { data: reviewRows } = await supabase
      .from("course_reviews")
      .select(
        `id, rating, first_name, body_text, submitted_at,
         display_title, display_last_initial,
         course_bookings:booking_id (
           auszubildende:auszubildende_id ( title, last_name )
         ),
         auszubildende:auszubildende_id ( title, last_name ),
         course_templates:template_id ( course_label_de, title )`,
      )
      .eq("is_published", true)
      .order("submitted_at", { ascending: false });
    publicReviews = ((reviewRows ?? []) as ReviewRow[]).map((r) => {
      const tpl = Array.isArray(r.course_templates)
        ? r.course_templates[0]
        : r.course_templates;
      const booking = Array.isArray(r.course_bookings)
        ? r.course_bookings[0]
        : r.course_bookings;
      // Doctor comes from the booking when present, otherwise from the
      // doctor-anchored auszubildende join (one-time bulk pass reviews
      // have no booking link).
      const directAzubi = Array.isArray(r.auszubildende)
        ? r.auszubildende[0]
        : r.auszubildende;
      const azubi =
        (booking
          ? Array.isArray(booking.auszubildende)
            ? booking.auszubildende[0]
            : booking.auszubildende
          : null) ?? directAzubi;
      // Single-letter, uppercase, A-Z + umlauts only. Anything weirder
      // (e.g. last_name starts with a digit) is dropped to NULL so the
      // displayed line stays clean.
      const azubiRawInitial = azubi?.last_name?.trim().charAt(0).toUpperCase() ?? "";
      const azubiInitial = /^[A-ZÄÖÜ]$/.test(azubiRawInitial) ? azubiRawInitial : null;
      // Cascade: prefer the auszubildende-derived values (they're
      // canonical for the doctor's booking record), fall back to the
      // manually-set display_* columns for imported testimonials that
      // have no booking link.
      const title = azubi?.title?.trim() || r.display_title?.trim() || null;
      const lastInitial = azubiInitial || r.display_last_initial?.trim().toUpperCase() || null;
      return {
        id: r.id,
        rating: r.rating,
        firstName: r.first_name,
        title,
        lastInitial,
        bodyText: r.body_text,
        submittedAt: r.submitted_at,
        courseLabel: tpl?.course_label_de || tpl?.title || null,
      };
    });
  }

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
  // Canonical marketing host is ephia.de; clean URL form (no /kurse/ prefix)
  // matches the canonical in metadata above and the sitemap entry.
  const siteUrl = "https://ephia.de";
  const courseUrl = `${siteUrl}/${content.slug}`;
  const priceCurrency = "EUR";
  const liveSessions = (sessions ?? []).filter((s) => s.is_live);

  const hasCourseInstance = [
    // An evergreen online instance (uses the Onlinekurs price if set)
    ...(template.price_gross_online_cents
      ? [
          {
            "@type": "CourseInstance",
            courseMode: "Online",
            courseWorkload: "PT10H",
            inLanguage: "de",
            offers: {
              "@type": "Offer",
              price: String(template.price_gross_online_cents / 100),
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
      ...(template.price_gross_praxis_cents || template.price_gross_kombi_cents
        ? {
            offers: {
              "@type": "Offer",
              price: String(
                (template.price_gross_kombi_cents ?? template.price_gross_praxis_cents ?? 0) / 100,
              ),
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

  // AggregateRating + review[] — only when this slug opts into the
  // Reviews section AND we have ≥1 published review. Google rejects
  // schema where the ratings/reviews aren't visibly on the page, so
  // both must be gated on the same condition that renders <Reviews />.
  const aggregateRating =
    publicReviews.length > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: (
            publicReviews.reduce((s, r) => s + r.rating, 0) /
            publicReviews.length
          ).toFixed(2),
          reviewCount: publicReviews.length,
          bestRating: 5,
          worstRating: 1,
        }
      : null;
  const reviewSchema =
    publicReviews.length > 0
      ? publicReviews.map((r) => ({
          "@type": "Review",
          author: {
            "@type": "Person",
            name: [r.title, r.firstName, r.lastInitial ? `${r.lastInitial}.` : null]
              .filter(Boolean)
              .join(" "),
          },
          datePublished: r.submittedAt,
          reviewRating: {
            "@type": "Rating",
            ratingValue: r.rating,
            bestRating: 5,
            worstRating: 1,
          },
          ...(r.bodyText ? { reviewBody: r.bodyText } : {}),
        }))
      : null;

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
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(reviewSchema ? { review: reviewSchema } : {}),
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
        item: `${siteUrl}/unsere-kurse`,
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
          content.hero.ctaOverride?.directCheckoutCourseKey && template.price_gross_online_cents
            ? `EUR ${(template.price_gross_online_cents / 100).toLocaleString("de-DE")}`
            : undefined
        }
      />
      <Lernziele content={content.lernziele} />
      {content.audience && <ProseSection content={content.audience} tone="rose" />}
      {!content.hideBookingWidget && (
        <CourseCardsPage template={template} sessions={sessions ?? []} />
      )}
      {content.location && <LocationInfo content={content.location} />}
      {content.learningPath && <LearningPath content={content.learningPath} />}
      {content.differentiators && (
        <ProseSection content={content.differentiators} tone="rose" />
      )}
      {/* Pure-online courses skip the Gruppenbuchungen pitch, group
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
          content.ctaBanner.directCheckoutCourseKey && template.price_gross_online_cents
            ? `EUR ${(template.price_gross_online_cents / 100).toLocaleString("de-DE")}`
            : undefined
        }
      />
      {publicReviews.length > 0 && <Reviews reviews={publicReviews} />}
      {/* On Reviews-enabled slugs, the long-form hand-curated
          <Testimonials> would duplicate names that now live in
          <Reviews> (e.g. Laura B., Nadja G., Lawik R. imported as
          is_imported rows). Suppress it on those slugs only — other
          course landings still surface the long-form quotes until we
          migrate them too. */}
      {!REVIEWS_ENABLED_SLUGS.has(content.slug) && (
        <Testimonials content={content.testimonials} />
      )}
      <Faq content={faqContent} />
      {content.relatedCourses && content.relatedCourses.length > 0 && (
        <RelatedCourses slugs={content.relatedCourses} />
      )}
    </>
  );
}
