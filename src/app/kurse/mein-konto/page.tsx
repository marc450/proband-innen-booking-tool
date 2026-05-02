import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

// Mirrors the SQL functions in migration 053. Kept in TS so the
// resolver doesn't have to round-trip to the DB for slug → key
// derivation on every booking.
const LW_TYPE_SUFFIXES = [
  "-praxiskurs",
  "-praxis-kurs",
  "-onlinekurs",
  "-online-kurs",
  "-kombikurs",
  "-kombi-kurs",
  "-hybrid",
];
const LW_LEVEL_PREFIXES = ["grundkurs-", "aufbaukurs-"];

function deriveCourseKey(productName: string): string | null {
  let s = productName.toLowerCase().trim();
  s = s.replace(/-\d{6,8}$/, "");
  for (const suf of LW_TYPE_SUFFIXES) {
    if (s.endsWith(suf)) {
      s = s.slice(0, -suf.length);
      break;
    }
  }
  for (const pre of LW_LEVEL_PREFIXES) {
    if (s.startsWith(pre)) {
      s = s.slice(pre.length);
      break;
    }
  }
  return s || null;
}

function deriveCourseType(productName: string): CourseType {
  const s = productName.toLowerCase();
  if (s.includes("praxiskurs") || s.includes("praxis-kurs")) return "Praxiskurs";
  if (s.includes("kombikurs") || s.includes("kombi-kurs")) return "Kombikurs";
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

// Build a fast lookup that supports both kinds of legacy_bookings
// product_name shapes:
//   1. LW slug ("grundkurs-medizinische-hautpflege") → match by
//      derived course_key.
//   2. HubSpot display name ("Onlinekurs medizinische Hautpflege")
//      → match by exact name_online/name_praxis/name_kombi (case-folded).
function buildTemplateIndex(templates: TemplateRow[]) {
  const byKey = new Map<string, TemplateRow>();
  const byName = new Map<string, { tpl: TemplateRow; type: CourseType }>();
  const norm = (s: string | null) =>
    (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  for (const t of templates) {
    if (t.course_key) byKey.set(t.course_key, t);
    if (t.name_online) byName.set(norm(t.name_online), { tpl: t, type: "Onlinekurs" });
    if (t.name_praxis) byName.set(norm(t.name_praxis), { tpl: t, type: "Praxiskurs" });
    if (t.name_kombi) byName.set(norm(t.name_kombi), { tpl: t, type: "Kombikurs" });
  }
  return {
    byKey,
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

function pickDisplayTitle(
  tpl: TemplateRow | undefined,
  type: CourseType,
  fallback: string,
): string {
  if (!tpl) return fallback;
  if (type === "Onlinekurs" && tpl.name_online) return tpl.name_online;
  if (type === "Praxiskurs" && tpl.name_praxis) return tpl.name_praxis;
  if (type === "Kombikurs" && tpl.name_kombi) return tpl.name_kombi;
  if (tpl.title) return tpl.title;
  return fallback;
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
    .select("id, first_name, last_name, email")
    .eq("user_id", user.id)
    .maybeSingle();

  let upcoming: EnrichedBooking[] = [];
  let online: EnrichedBooking[] = [];
  let done: EnrichedBooking[] = [];

  if (contact) {
    const [{ data: rawBookings }, { data: templates }] = await Promise.all([
      admin
        .from("legacy_bookings")
        .select("id, product_name, course_date, purchased_at, source")
        .eq("auszubildende_id", contact.id)
        .order("purchased_at", { ascending: false, nullsFirst: false }),
      admin
        .from("course_templates")
        .select(
          "course_key, title, image_url, name_online, name_praxis, name_kombi, lw_slug_online, lw_slug_praxis, lw_slug_kombi, lw_slug_hybrid",
        ),
    ]);

    const tplIndex = buildTemplateIndex((templates ?? []) as TemplateRow[]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const b of rawBookings ?? []) {
      const productName = b.product_name as string;
      const isLw = (b.source as string | null)?.startsWith("lw_") ?? false;

      let tpl: TemplateRow | undefined;
      let courseType: CourseType;

      if (isLw) {
        // LW source: derive course_key + type from the slug.
        courseType = deriveCourseType(productName);
        const key = deriveCourseKey(productName);
        tpl = key ? tplIndex.byKey.get(key) : undefined;
      } else {
        // HubSpot source: exact-match the German display name against
        // template.name_<type>. Falls back to slug-style derivation if
        // no name match (defensive — shouldn't happen with current data).
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

      // Skip merch — they're not courses, no useful card to render.
      if (courseType === "Merch") continue;

      // URL preference: per-row LW slug if it's a LW import (already
      // the right slug, including any session-specific date suffix).
      // Otherwise the canonical slug stored on the template.
      const slug = isLw ? productName : pickLwSlug(tpl, courseType);
      const lwHref = slug ? `https://learn.ephia.de/course/${slug}` : null;

      const enriched: EnrichedBooking = {
        id: b.id as string,
        productName,
        displayTitle: pickDisplayTitle(tpl, courseType, productName),
        courseType,
        courseDate: (b.course_date as string | null) ?? null,
        purchasedAt: (b.purchased_at as string | null) ?? null,
        source: (b.source as string | null) ?? null,
        imageUrl: tpl?.image_url ?? null,
        lwHref,
      };

      const isUpcomingPraxis =
        (courseType === "Praxiskurs" ||
          courseType === "Kombikurs" ||
          courseType === "Hybrid") &&
        enriched.courseDate &&
        new Date(enriched.courseDate) >= today;

      if (isUpcomingPraxis) {
        upcoming.push(enriched);
      } else if (courseType === "Onlinekurs") {
        // We treat all online courses as "active" until the LW API
        // tells us otherwise. v3 wires up real progress + a "completed"
        // bucket inside Abgeschlossen.
        online.push(enriched);
      } else {
        done.push(enriched);
      }
    }

    // Upcoming: closest date first.
    upcoming = upcoming.sort((a, b) => {
      const da = a.courseDate ? new Date(a.courseDate).getTime() : Infinity;
      const db = b.courseDate ? new Date(b.courseDate).getTime() : Infinity;
      return da - db;
    });
    // Done: most recent first (purchasedAt or courseDate).
    done = done.sort((a, b) => {
      const da = new Date(a.courseDate ?? a.purchasedAt ?? 0).getTime();
      const db = new Date(b.courseDate ?? b.purchasedAt ?? 0).getTime();
      return db - da;
    });
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
