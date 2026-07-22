import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { berlinTodayIso } from "@/lib/utils";
import { fetchPublicReviews } from "@/lib/fetch-public-reviews";
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
      url: `https://ephia.de/${content.slug}`,
      locale: "de_DE",
      // The page serves the whole DACH market (see `languages` below).
      alternateLocale: ["de_AT", "de_CH"],
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
      // One German page serves the whole DACH market (the FAQ addresses
      // AT/CH participants explicitly). There is no per-region variant,
      // so every region tag points at the same URL and x-default catches
      // everyone else. This stops Google from treating de-AT/de-CH
      // searchers as out of scope for a de_DE-only page.
      languages: {
        de: `https://ephia.de/${content.slug}`,
        "de-DE": `https://ephia.de/${content.slug}`,
        "de-AT": `https://ephia.de/${content.slug}`,
        "de-CH": `https://ephia.de/${content.slug}`,
        "x-default": `https://ephia.de/${content.slug}`,
      },
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

  // Fetch live, upcoming sessions. A course is hidden from the day it
  // starts onward (date_iso strictly after today in Berlin), so the
  // booking date picker and the JSON-LD event schema never surface a
  // course on or after its start day.
  const { data: sessions } = await supabase
    .from("course_sessions")
    .select("*")
    .eq("template_id", sessionTemplateId)
    .eq("is_live", true)
    .gt("date_iso", berlinTodayIso())
    .order("date_iso", { ascending: true });

  // Public reviews — only fetched on slugs that opt in (see
  // REVIEWS_ENABLED_SLUGS above). Surfaces ALL published reviews (not
  // just the ones tied to the current template), so the carousel reads
  // cross-course feedback as one signal. Same loader feeds the home
  // page review carousel.
  let publicReviews: PublicReview[] = [];
  if (REVIEWS_ENABLED_SLUGS.has(content.slug)) {
    publicReviews = await fetchPublicReviews(supabase);
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

  // Google requires courseMode PLUS courseWorkload (or courseSchedule) on
  // every CourseInstance. An instance missing it is silently dropped from
  // the Course rich result, so the Praxis dates that actually convert
  // would never show. `course_sessions.duration_minutes` is the real,
  // staff-maintained length (360 for the 6h Praxistag); the content
  // fallback only kicks in for rows where it was never filled.
  const isoDuration = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `PT${h > 0 ? `${h}H` : ""}${m > 0 ? `${m}M` : ""}` || "PT0M";
  };
  const onlineWorkload = content.schema?.onlineWorkload ?? "PT10H";
  const praxisWorkloadFallback = content.schema?.praxisWorkload ?? "PT6H";

  // start_time comes back as "10:00" or "10:00:00" depending on the column
  // cast; pad it to a full ISO 8601 local time either way.
  const normalizeTime = (t: string): string =>
    t.split(":").length === 2 ? `${t}:00` : t;

  // startDate + duration, as a local ISO timestamp. All arithmetic runs in
  // UTC so the result never shifts with the server's timezone — these are
  // wall-clock Berlin times and must render exactly as stored.
  const localEndDate = (
    dateIso: string,
    startTime: string,
    minutes: number,
  ): string => {
    const [h, m] = normalizeTime(startTime).split(":").map(Number);
    const d = new Date(`${dateIso}T00:00:00Z`);
    d.setUTCMinutes(d.getUTCMinutes() + h * 60 + m + minutes);
    return d.toISOString().slice(0, 19);
  };

  // Venue addresses are stored per session as one free-text line, e.g.
  // "HYSTUDIO, Rosa-Luxemburg-Straße 20, 10178 Berlin, Deutschland".
  // A structured PostalAddress also feeds local/map surfaces, so split it
  // when it matches that shape and fall back to the bare name when it
  // doesn't — never guess at a malformed address.
  const parsePlace = (address: string) => {
    const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const plzCity = parts[parts.length - 2].match(/^(\d{4,5})\s+(.+)$/);
      const country = parts[parts.length - 1];
      if (plzCity) {
        return {
          "@type": "Place",
          name: parts[0],
          address: {
            "@type": "PostalAddress",
            streetAddress: parts.slice(1, parts.length - 2).join(", "),
            postalCode: plzCity[1],
            addressLocality: plzCity[2],
            addressCountry: /deutschland|germany/i.test(country) ? "DE" : country,
          },
        };
      }
    }
    return { "@type": "Place", name: address };
  };

  const hasCourseInstance = [
    // An evergreen online instance (uses the Onlinekurs price if set)
    ...(template.price_gross_online_cents
      ? [
          {
            "@type": "CourseInstance",
            courseMode: "Online",
            courseWorkload: onlineWorkload,
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
      courseWorkload: s.duration_minutes
        ? isoDuration(s.duration_minutes)
        : praxisWorkloadFallback,
      // Combine the date with the session start time so Google gets a
      // precise startDate rather than a bare day, and derive endDate from
      // the same duration that feeds courseWorkload.
      startDate: s.start_time
        ? `${s.date_iso}T${normalizeTime(s.start_time)}`
        : s.date_iso,
      ...(s.start_time && s.duration_minutes
        ? { endDate: localEndDate(s.date_iso, s.start_time, s.duration_minutes) }
        : {}),
      ...(s.max_seats ? { maximumAttendeeCapacity: s.max_seats } : {}),
      ...(s.instructor_name
        ? { instructor: { "@type": "Person", name: s.instructor_name } }
        : {}),
      ...(s.address ? { location: parsePlace(s.address) } : {}),
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

  // Course-level enrichment. `instructor` is the strongest missing
  // signal — the copy is full of credentialed Dozent:innen that
  // structured data couldn't see. Names come from the same session rows
  // the booking widget renders, deduped and capped so the block stays
  // readable.
  const instructorNames = Array.from(
    new Set(
      (content.hideBookingWidget ? [] : liveSessions)
        .map((s) => s.instructor_name)
        .filter((n): n is string => !!n),
    ),
  );
  const instructorSchema = instructorNames.map((name) => {
    // instructor_name carries the honorific inline ("Dr. Sarah Stannek").
    const match = name.match(/^((?:Prof\.|Dr\.|PD)(?:\s(?:Prof\.|Dr\.|med\.))*)\s+(.+)$/);
    return {
      "@type": "Person",
      name,
      ...(match ? { honorificPrefix: match[1], givenName: match[2].split(" ")[0] } : {}),
    };
  });

  // The three bookable packages as Course-level offers, so the price
  // range is visible even where CourseInstance offers are not surfaced.
  const packageOffers = (
    [
      ["online", template.price_gross_online_cents],
      ["praxis", template.price_gross_praxis_cents],
      ["kombi", template.price_gross_kombi_cents],
    ] as const
  )
    .filter(([, cents]) => !!cents)
    .map(([variant, cents]) => ({
      "@type": "Offer",
      name:
        (variant === "online"
          ? template.name_online
          : variant === "praxis"
            ? template.name_praxis
            : template.name_kombi) ?? undefined,
      price: String((cents as number) / 100),
      priceCurrency,
      availability: "https://schema.org/InStock",
      category: variant === "online" ? "Online" : "Onsite",
      url: courseUrl,
    }));

  // `teaches` defaults to the Lernziele actually rendered on the page —
  // never invent claims structured data can't back up visually.
  const teaches =
    content.schema?.teaches ?? content.lernziele.items.map((i) => i.label);

  // Absolute URL for the Course image. ogImage is a /public path.
  const courseImage = content.meta.ogImage
    ? `${siteUrl}${content.meta.ogImage}`
    : (template.image_url ?? undefined);

  // CME points for THIS course = the Kombi figure (Online + Praxis).
  // Deliberately not the Komplettpaket number quoted in the copy: that
  // one only holds when three further Onlinekurse are bought alongside,
  // so claiming it here would overstate what the Course entity awards.
  const numberOfCredits =
    content.schema?.numberOfCredits ?? (cmeKombiNum ? Number(cmeKombiNum) : undefined);

  // Only reviews the doctor actually submitted through the tokenised
  // link feed the structured data. The `is_imported` rows are the old
  // hand-curated Testimonials: genuine quotes, but never submitted via
  // the review flow, and all three share one identical `submitted_at`
  // (the bulk-import moment) which would become a fabricated
  // `datePublished`. They stay visible on the page as testimonials;
  // they just must not be marked up as dated Review entities or counted
  // into aggregateRating.
  const schemaReviews = publicReviews.filter((r) => !r.isImported);

  // AggregateRating + review[] — only when this slug opts into the
  // Reviews section AND we have ≥1 eligible review. Google rejects
  // schema where the ratings/reviews aren't visibly on the page, so
  // both must be gated on the same condition that renders <Reviews />.
  const aggregateRating =
    schemaReviews.length > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: (
            schemaReviews.reduce((s, r) => s + r.rating, 0) /
            schemaReviews.length
          ).toFixed(2),
          reviewCount: schemaReviews.length,
          bestRating: 5,
          worstRating: 1,
        }
      : null;
  const reviewSchema =
    schemaReviews.length > 0
      ? schemaReviews.map((r) => ({
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
    inLanguage: "de",
    isAccessibleForFree: false,
    provider: {
      "@type": "Organization",
      name: "EPHIA",
      url: "https://ephia.de",
    },
    ...(courseImage ? { image: courseImage } : {}),
    ...(packageOffers.length > 0 ? { offers: packageOffers } : {}),
    ...(instructorSchema.length > 0 ? { instructor: instructorSchema } : {}),
    ...(teaches.length > 0 ? { teaches } : {}),
    ...(content.schema?.coursePrerequisites?.length
      ? { coursePrerequisites: content.schema.coursePrerequisites }
      : {}),
    ...(content.schema?.educationalCredentialAwarded
      ? { educationalCredentialAwarded: content.schema.educationalCredentialAwarded }
      : {}),
    ...(content.schema?.educationalLevel
      ? { educationalLevel: content.schema.educationalLevel }
      : {}),
    ...(numberOfCredits ? { numberOfCredits } : {}),
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
      {publicReviews.length > 0 && <Reviews reviews={publicReviews} />}
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
