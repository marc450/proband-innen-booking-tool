import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildProgressMap, listUserProgress } from "@/lib/learnworlds";
import {
  MeinKontoView,
  type EnrichedBooking,
  type CourseType,
} from "./mein-konto-view";

// Customer-facing dashboard. Server component pulls the auszubildende
// row by user_id (set during set-password) and the legacy_bookings list,
// resolves each booking against course_templates so every card has a
// real image, branded title and a working "Zum Kurs" URL — regardless
// of whether the booking came from the LW import or the HubSpot import.
//
// v1 (single grid) is replaced by a three-section layout:
//   1. Anstehende Termine — Praxis/Kombi/Hybrid bookings with a
//      future course_date. Hero card with date + Proband-Buddy CTA.
//   2. Deine Onlinekurse — Online bookings, image grid with a single
//      "Weiterlernen →" CTA. The actual progress + last-activity bar
//      lights up in v3 once we have the LW API call.
//   3. Abgeschlossen — past Praxis sessions + everything else, compact
//      list rows.
//
// "Past attendance is assumed" rule (per Marc): if a booking isn't
// cancelled and its course_date is before today, treat as participated.
// legacy_bookings doesn't carry status today, so for now we just check
// the date; cancelled imports don't make it into legacy_bookings.

export const metadata: Metadata = {
  title: "Mein Konto | EPHIA",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://ephia.de/mein-konto" },
};

export const dynamic = "force-dynamic";

// Mirrors the SQL functions in migration 055. Kept in TS so the
// resolver doesn't have to round-trip to the DB for slug → key
// derivation on every booking.
//
// LW slugs and course_templates.course_key share the same level prefix
// (grundkurs/aufbaukurs/masterclass) but differ in two ways:
//   - slugs use hyphens, course_keys use underscores
//   - slugs carry a type suffix (-online / -praxis / -kombi / -hybrid,
//     plus the older -onlinekurs etc. variants) and may carry a date
//     suffix on praxis sessions
//
// Order matters in the suffix list: longer suffixes first so
// "-onlinekurs" matches before the bare "-online" on slugs that have
// the longer form.
const LW_TYPE_SUFFIXES = [
  "-praxiskurs",
  "-praxis-kurs",
  "-onlinekurs",
  "-online-kurs",
  "-kombikurs",
  "-kombi-kurs",
  "-hybrid",
  "-online",
  "-praxis",
  "-kombi",
];

function deriveCourseKey(productName: string): string | null {
  let s = productName.toLowerCase().trim();
  s = s.replace(/-\d{6,8}$/, "");
  for (const suf of LW_TYPE_SUFFIXES) {
    if (s.endsWith(suf)) {
      s = s.slice(0, -suf.length);
      break;
    }
  }
  // course_templates.course_key uses underscores throughout. We DON'T
  // strip the level prefix — templates carry it (e.g. grundkurs_botulinum)
  // because the same root word can have a separate template per level.
  s = s.replace(/-/g, "_");
  return s || null;
}

function deriveCourseType(productName: string): CourseType {
  const s = productName.toLowerCase();
  if (s.includes("praxis")) return "Praxiskurs";
  if (s.includes("kombi")) return "Kombikurs";
  if (s.includes("hybrid")) return "Hybrid";
  if (s.includes("cap ") || s.includes("schatten")) return "Merch";
  if (s.includes("online")) return "Onlinekurs";
  if (/\d{6,}/.test(s)) return "Praxiskurs";
  return "Onlinekurs";
}

interface TemplateRow {
  course_key: string | null;
  title: string | null;
  image_url: string | null;
  name_online: string | null;
  name_praxis: string | null;
  name_kombi: string | null;
  lw_slug_online: string | null;
  lw_slug_praxis: string | null;
  lw_slug_kombi: string | null;
  lw_slug_hybrid: string | null;
}

// Build a fast lookup that supports three matching strategies, in
// priority order:
//
//   1. Exact slug match against any of lw_slug_online / _praxis /
//      _kombi / _hybrid. This is the most reliable path: the slug is
//      either auto-backfilled from legacy_bookings (053–055) or
//      manually filled by an admin for the cases where naming drift
//      between LW and the template makes derivation impossible
//      (e.g. LW slug "aufbaukurs-medizinische-indikation-fuer-botulinum"
//      vs course_key "aufbaukurs_therapeutische_indikationen_botulinum").
//
//   2. course_key match (LW slug → derive key → look up). Fallback
//      for slugs that haven't been registered on a template yet.
//
//   3. HubSpot display name match against name_online/_praxis/_kombi.
//      Case-folded, whitespace-collapsed.
function buildTemplateIndex(templates: TemplateRow[]) {
  const byKey = new Map<string, TemplateRow>();
  const bySlug = new Map<string, { tpl: TemplateRow; type: CourseType }>();
  const byName = new Map<string, { tpl: TemplateRow; type: CourseType }>();
  const norm = (s: string | null) =>
    (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  for (const t of templates) {
    if (t.course_key) byKey.set(t.course_key, t);
    if (t.lw_slug_online) bySlug.set(t.lw_slug_online.toLowerCase(), { tpl: t, type: "Onlinekurs" });
    if (t.lw_slug_praxis) bySlug.set(t.lw_slug_praxis.toLowerCase(), { tpl: t, type: "Praxiskurs" });
    if (t.lw_slug_kombi) bySlug.set(t.lw_slug_kombi.toLowerCase(), { tpl: t, type: "Kombikurs" });
    if (t.lw_slug_hybrid) bySlug.set(t.lw_slug_hybrid.toLowerCase(), { tpl: t, type: "Hybrid" });
    if (t.name_online) byName.set(norm(t.name_online), { tpl: t, type: "Onlinekurs" });
    if (t.name_praxis) byName.set(norm(t.name_praxis), { tpl: t, type: "Praxiskurs" });
    if (t.name_kombi) byName.set(norm(t.name_kombi), { tpl: t, type: "Kombikurs" });
  }
  return {
    byKey,
    matchSlug: (slug: string) => bySlug.get(slug.toLowerCase()) ?? null,
    matchHubspotName: (productName: string) => {
      return byName.get(productName.trim().toLowerCase().replace(/\s+/g, " ")) ?? null;
    },
  };
}

function pickLwSlug(tpl: TemplateRow | undefined, type: CourseType): string | null {
  if (!tpl) return null;
  switch (type) {
    case "Onlinekurs":
      return tpl.lw_slug_online;
    case "Praxiskurs":
      return tpl.lw_slug_praxis;
    case "Kombikurs":
      return tpl.lw_slug_kombi;
    case "Hybrid":
      return tpl.lw_slug_hybrid;
    default:
      return null;
  }
}

// Prefer the template's bare title ("Grundkurs Botulinum") over the
// type-decorated name ("Onlinekurs Botulinum"). The card already
// renders a type pill above the title, so repeating "Onlinekurs" in
// the title would be visual stutter. Falls back to the type-decorated
// name only if title isn't set.
function pickDisplayTitle(
  tpl: TemplateRow | undefined,
  type: CourseType,
  fallback: string,
): string {
  if (!tpl) return fallback;
  if (tpl.title) return tpl.title;
  if (type === "Onlinekurs" && tpl.name_online) return tpl.name_online;
  if (type === "Praxiskurs" && tpl.name_praxis) return tpl.name_praxis;
  if (type === "Kombikurs" && tpl.name_kombi) return tpl.name_kombi;
  return fallback;
}

function normalizeCourseType(raw: string | null): CourseType {
  switch ((raw ?? "").toLowerCase()) {
    case "onlinekurs":
      return "Onlinekurs";
    case "praxiskurs":
      return "Praxiskurs";
    case "kombikurs":
      return "Kombikurs";
    case "hybrid":
      return "Hybrid";
    default:
      return "Kurs";
  }
}

// Per Marc: Kombi is a billing convention only. On the customer
// dashboard, every Kombi booking is rendered as TWO cards — one
// Onlinekurs (immediate access) and one Praxiskurs (scheduled
// session). This helper takes the resolved (template, type) plus
// per-row metadata and returns either one or two EnrichedBookings
// accordingly.
function makeEnriched(args: {
  id: string;
  productName: string;
  tpl: TemplateRow | undefined;
  courseType: CourseType;
  courseDate: string | null;
  purchasedAt: string | null;
  source: string | null;
  rowSlug: string | null;
  location?: string | null;
  startTime?: string | null;
  instructor?: string | null;
}): EnrichedBooking[] {
  const {
    id,
    productName,
    tpl,
    courseType,
    courseDate,
    purchasedAt,
    source,
    rowSlug,
    location = null,
    startTime = null,
    instructor = null,
  } = args;
  const imageUrl = tpl?.image_url ?? null;

  const buildOne = (
    suffix: string,
    type: CourseType,
    slugOverride: string | null,
  ): EnrichedBooking => {
    const slug = slugOverride ?? pickLwSlug(tpl, type);
    return {
      id: `${id}${suffix}`,
      productName,
      displayTitle: pickDisplayTitle(tpl, type, productName),
      courseType: type,
      courseDate: type === "Onlinekurs" ? null : courseDate,
      purchasedAt,
      source,
      imageUrl,
      lwHref: slug
        ? `/api/auth/lw-sso?redirectUrl=${encodeURIComponent(`https://learn.ephia.de/course/${slug}`)}`
        : null,
      lwSlug: slug,
      location: type === "Onlinekurs" ? null : location,
      startTime: type === "Onlinekurs" ? null : startTime,
      instructor: type === "Onlinekurs" ? null : instructor,
    };
  };

  if (courseType === "Kombikurs") {
    // For Kombi, we don't honour rowSlug for the Praxis variant: a
    // kombi-tagged slug points at the LW kombi course, but we want
    // the customer to land on the dedicated praxis course page.
    return [
      buildOne(":online", "Onlinekurs", null),
      buildOne(":praxis", "Praxiskurs", null),
    ];
  }

  return [buildOne("", courseType, rowSlug)];
}

// Drops a booking into the right section based on type + date.
function routeBooking(
  e: EnrichedBooking,
  today: Date,
  upcoming: EnrichedBooking[],
  online: EnrichedBooking[],
  done: EnrichedBooking[],
) {
  const isUpcomingPraxis =
    (e.courseType === "Praxiskurs" || e.courseType === "Hybrid") &&
    e.courseDate &&
    new Date(e.courseDate) >= today;

  if (isUpcomingPraxis) {
    upcoming.push(e);
  } else if (e.courseType === "Onlinekurs") {
    online.push(e);
  } else {
    done.push(e);
  }
}

export default async function MeinKontoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/start");

  const admin = createAdminClient();

  const { data: contact } = await admin
    .from("auszubildende")
    .select("id, first_name, last_name, email, lw_user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let upcoming: EnrichedBooking[] = [];
  let online: EnrichedBooking[] = [];
  let done: EnrichedBooking[] = [];

  if (contact) {
    // Gather every email this customer is known by. course_bookings
    // is matched by email (no auszubildende_id FK), so a customer with
    // an alias on auszubildende_emails would otherwise lose any new
    // bookings made under that alias.
    const allEmails: string[] = [];
    if (contact.email) allEmails.push(contact.email.toLowerCase());
    const { data: aliases } = await admin
      .from("auszubildende_emails")
      .select("email")
      .eq("auszubildende_id", contact.id);
    for (const a of aliases ?? []) {
      const e = (a.email as string | null)?.toLowerCase();
      if (e && !allEmails.includes(e)) allEmails.push(e);
    }

    const [
      { data: legacyRows },
      { data: courseRows },
      { data: templates },
    ] = await Promise.all([
      admin
        .from("legacy_bookings")
        .select("id, product_name, course_date, purchased_at, source")
        .eq("auszubildende_id", contact.id)
        .order("purchased_at", { ascending: false, nullsFirst: false }),
      // Post-cutover purchases live in course_bookings, with template +
      // session linked directly. We don't need fuzzy matching for these —
      // template_id resolves the template, course_type tells us the
      // type, and the joined course_session gives us date + location.
      allEmails.length > 0
        ? admin
            .from("course_bookings")
            .select(
              `id, course_type, status, created_at, template_id,
               session:course_sessions(date_iso, start_time, address, instructor_name, label_de)`,
            )
            .in("email", allEmails)
            .neq("status", "cancelled")
        : Promise.resolve({ data: [] }),
      admin
        .from("course_templates")
        .select(
          "id, course_key, title, image_url, name_online, name_praxis, name_kombi, lw_slug_online, lw_slug_praxis, lw_slug_kombi, lw_slug_hybrid",
        ),
    ]);

    const tplIndex = buildTemplateIndex((templates ?? []) as TemplateRow[]);
    const tplById = new Map<string, TemplateRow>();
    for (const t of (templates ?? []) as Array<TemplateRow & { id: string }>) {
      tplById.set(t.id, t);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ── 1) legacy_bookings ──
    for (const b of legacyRows ?? []) {
      const productName = b.product_name as string;
      const isLw = (b.source as string | null)?.startsWith("lw_") ?? false;

      // Resolve template + type. Strategy ordered by reliability.
      let tpl: TemplateRow | undefined;
      let courseType: CourseType;
      if (isLw) {
        const slugMatch = tplIndex.matchSlug(productName);
        if (slugMatch) {
          tpl = slugMatch.tpl;
          courseType = slugMatch.type;
        } else {
          courseType = deriveCourseType(productName);
          const key = deriveCourseKey(productName);
          tpl = key ? tplIndex.byKey.get(key) : undefined;
        }
      } else {
        const named = tplIndex.matchHubspotName(productName);
        if (named) {
          tpl = named.tpl;
          courseType = named.type;
        } else {
          courseType = deriveCourseType(productName);
          const key = deriveCourseKey(productName);
          tpl = key ? tplIndex.byKey.get(key) : undefined;
        }
      }
      if (courseType === "Merch") continue;

      const enriched = makeEnriched({
        id: b.id as string,
        productName,
        tpl,
        courseType,
        courseDate: (b.course_date as string | null) ?? null,
        purchasedAt: (b.purchased_at as string | null) ?? null,
        source: (b.source as string | null) ?? null,
        // For LW imports, prefer the per-row slug — it carries
        // session-specific suffixes (e.g. praxiskurs-21062025).
        rowSlug: isLw ? productName : null,
      });

      enriched.forEach((e) => routeBooking(e, today, upcoming, online, done));
    }

    // ── 2) course_bookings (post-cutover purchases) ──
    type RawSession = {
      date_iso: string | null;
      start_time: string | null;
      address: string | null;
      instructor_name: string | null;
      label_de: string | null;
    };
    type RawCourseBooking = {
      id: string;
      course_type: string;
      status: string | null;
      created_at: string | null;
      template_id: string | null;
      // Supabase types embedded relations as arrays even when the FK
      // is many-to-one. We take the first element.
      session: RawSession[] | RawSession | null;
    };
    for (const cb of (courseRows ?? []) as unknown as RawCourseBooking[]) {
      const session: RawSession | null = Array.isArray(cb.session)
        ? cb.session[0] ?? null
        : cb.session;
      const tpl = cb.template_id ? tplById.get(cb.template_id) : undefined;
      const courseType = normalizeCourseType(cb.course_type);
      if (courseType === "Merch") continue;

      const enriched = makeEnriched({
        id: cb.id,
        productName: session?.label_de ?? "",
        tpl,
        courseType,
        courseDate: session?.date_iso ?? null,
        purchasedAt: cb.created_at ?? null,
        source: "course_booking",
        // No rowSlug: for post-cutover bookings the template's stored
        // lw_slug_<type> is the right URL (the Stripe flow doesn't
        // record the LW slug per row).
        rowSlug: null,
        location: session?.address ?? null,
        startTime: session?.start_time ?? null,
        instructor: session?.instructor_name ?? null,
      });

      enriched.forEach((e) => routeBooking(e, today, upcoming, online, done));
    }

    upcoming = upcoming.sort((a, b) => {
      const da = a.courseDate ? new Date(a.courseDate).getTime() : Infinity;
      const db = b.courseDate ? new Date(b.courseDate).getTime() : Infinity;
      return da - db;
    });
    done = done.sort((a, b) => {
      const da = new Date(a.courseDate ?? a.purchasedAt ?? 0).getTime();
      const db = new Date(b.courseDate ?? b.purchasedAt ?? 0).getTime();
      return db - da;
    });

    // ── 3) Attach LW progress to online cards ──
    // Single API call per page load. If the customer has no lw_user_id
    // (HubSpot-only contact, or a new Stripe purchase before we wire
    // checkout to provision an LW user), skip silently — cards just
    // render without a progress bar.
    if (contact.lw_user_id && online.length > 0) {
      try {
        const rows = await listUserProgress(contact.lw_user_id as string);
        const progress = buildProgressMap(rows);
        online = online.map((b) => {
          const pct = b.lwSlug ? progress.get(b.lwSlug) : undefined;
          return pct !== undefined ? { ...b, progressPct: pct } : b;
        });
      } catch (err) {
        // LW API outage / token expiry / rate limit: don't fail the
        // whole dashboard. Log + render the cards without progress.
        console.error("[mein-konto] LW progress fetch failed:", err);
      }
    }
  }

  return (
    <MeinKontoView
      firstName={contact?.first_name ?? null}
      upcoming={upcoming}
      online={online}
      done={done}
    />
  );
}
