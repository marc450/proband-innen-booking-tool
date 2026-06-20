// Shared LearnWorlds course resolver.
//
// Both the customer dashboard (/kurse/mein-konto) and the admin
// LMS-Zugriff panel (/api/admin/auszubildende/[id]/lw-access) have to
// answer the same question: given a booking's product_name (an LW slug
// or a HubSpot display name), which course_templates row does it map to,
// and what course type is it? Keeping a single resolver here means the
// admin diagnostic always agrees with what the customer actually sees —
// the id-split between online_course_id and lw_slug_* is drift-prone, so
// there must be exactly one place that reconciles it.
//
// Extracted verbatim from mein-konto/page.tsx; that page now imports
// from here.

export type CourseType =
  | "Onlinekurs"
  | "Praxiskurs"
  | "Kombikurs"
  | "Hybrid"
  | "Merch"
  | "Kurs";

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
export const LW_TYPE_SUFFIXES = [
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

export function deriveCourseKey(productName: string): string | null {
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

export function deriveCourseType(productName: string): CourseType {
  const s = productName.toLowerCase();
  if (s.includes("praxis")) return "Praxiskurs";
  if (s.includes("kombi")) return "Kombikurs";
  if (s.includes("hybrid")) return "Hybrid";
  if (s.includes("cap ") || s.includes("schatten")) return "Merch";
  if (s.includes("online")) return "Onlinekurs";
  if (/\d{6,}/.test(s)) return "Praxiskurs";
  return "Onlinekurs";
}

export interface TemplateRow {
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
  // The course id used for the LW enrollment API + the admin "Zugriff
  // aktiv" check (migration 018). For LW the enrollment id doubles as
  // the course URL slug, so we fall back to it when lw_slug_online
  // (migration 053) was never backfilled — otherwise the online card
  // renders with no "Zum Kurs" link even though the customer is enrolled.
  online_course_id: string | null;
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
export function buildTemplateIndex(templates: TemplateRow[]) {
  const byKey = new Map<string, TemplateRow>();
  const bySlug = new Map<string, { tpl: TemplateRow; type: CourseType }>();
  const byName = new Map<string, { tpl: TemplateRow; type: CourseType }>();
  const norm = (s: string | null) =>
    (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  for (const t of templates) {
    if (t.course_key) byKey.set(t.course_key, t);
    if (t.lw_slug_online) bySlug.set(t.lw_slug_online.toLowerCase(), { tpl: t, type: "Onlinekurs" });
    // Fallback so a customer's actual LW enrollment (keyed on
    // online_course_id) still matches a template when lw_slug_online
    // was never backfilled. Only register it when it wouldn't shadow an
    // explicit lw_slug_online mapping.
    else if (t.online_course_id) bySlug.set(t.online_course_id.toLowerCase(), { tpl: t, type: "Onlinekurs" });
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
