import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MeinKontoView, type EnrichedBooking } from "./mein-konto-view";

// Customer-facing dashboard. Server component pulls the auszubildende
// row by user_id (set during set-password) and the legacy_bookings list,
// resolves each booking against course_templates for image + branded
// display title, then hands the enriched list to the client view.
//
// v1 is intentionally minimal: a card grid of past bookings with a
// "Zum Kurs" CTA out to the LW course page. The richer features (LW
// course progress + certificates via API, click-to-launch SSO, basket,
// curricula UI) ship in follow-up commits once the foundation is
// verified end-to-end.
export const metadata: Metadata = {
  title: "Mein Konto | EPHIA",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://ephia.de/mein-konto" },
};

export const dynamic = "force-dynamic";

// LW course slugs encode their type as a suffix and (for Praxiskurs
// sessions) a trailing date. We strip both so the remainder is the
// bare "course key" we can match against course_templates.course_key.
const LW_TYPE_SUFFIXES = [
  "-praxiskurs",
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

function deriveCourseType(productName: string): EnrichedBooking["courseType"] {
  const s = productName.toLowerCase();
  if (s.includes("praxiskurs") || s.includes("praxis-kurs")) return "Praxiskurs";
  if (s.includes("kombikurs") || s.includes("kombi-kurs")) return "Kombikurs";
  if (s.includes("hybrid")) return "Hybrid";
  if (s.includes("cap ") || s.includes("schatten")) return "Merch";
  if (s.includes("online")) return "Onlinekurs";
  // A six-or-more-digit run usually means a date suffix on a LW
  // praxiskurs slug like grundkurs-botulinum-praxiskurs-21062025.
  if (/\d{6,}/.test(s)) return "Praxiskurs";
  return "Kurs";
}

export default async function MeinKontoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/start");
  }

  const admin = createAdminClient();

  // Resolve the contact via user_id (set when the customer set their
  // password through /api/auth/set-password). user_id is unique on
  // auszubildende — at most one match. Staff accounts who happen to
  // also be in auszubildende (e.g. Marc, who's both an admin and a
  // legacy-imported customer) see their own bookings here too — which
  // is fine; the sensitive surface is admin.ephia.de, gated separately.
  const { data: contact } = await admin
    .from("auszubildende")
    .select("id, first_name, last_name, email")
    .eq("user_id", user.id)
    .maybeSingle();

  let bookings: EnrichedBooking[] = [];

  if (contact) {
    const { data: rawBookings } = await admin
      .from("legacy_bookings")
      .select("id, product_name, course_date, purchased_at, source")
      .eq("auszubildende_id", contact.id)
      .order("purchased_at", { ascending: false, nullsFirst: false });

    // Pull every course template once and build a course_key →
    // template lookup. Per-booking we then derive the bare course key
    // from the LW slug and resolve image + per-type display title.
    // Cheap because there are only a handful of templates.
    const { data: templates } = await admin
      .from("course_templates")
      .select(
        "course_key, title, image_url, name_online, name_praxis, name_kombi",
      );
    const tplByKey = new Map<
      string,
      {
        title: string | null;
        image_url: string | null;
        name_online: string | null;
        name_praxis: string | null;
        name_kombi: string | null;
      }
    >();
    for (const t of templates ?? []) {
      if (t.course_key) tplByKey.set(t.course_key as string, t);
    }

    bookings = (rawBookings ?? []).map((b) => {
      const courseType = deriveCourseType(b.product_name);
      const key = deriveCourseKey(b.product_name);
      const tpl = key ? tplByKey.get(key) : undefined;
      const displayTitle =
        (courseType === "Onlinekurs" && tpl?.name_online) ||
        (courseType === "Praxiskurs" && tpl?.name_praxis) ||
        (courseType === "Kombikurs" && tpl?.name_kombi) ||
        tpl?.title ||
        b.product_name;
      // Only LW imports give us a real course slug we can hand back to
      // LW. HubSpot rows store the German marketing product name which
      // doesn't resolve to a course-page URL — those don't get a CTA.
      const lwHref = b.source?.startsWith("lw_")
        ? `https://learn.ephia.de/course/${b.product_name}`
        : null;
      return {
        id: b.id as string,
        productName: b.product_name as string,
        displayTitle,
        courseType,
        courseDate: (b.course_date as string | null) ?? null,
        purchasedAt: (b.purchased_at as string | null) ?? null,
        source: (b.source as string | null) ?? null,
        imageUrl: tpl?.image_url ?? null,
        lwHref,
      };
    });
  }

  return (
    <MeinKontoView
      firstName={contact?.first_name ?? null}
      bookings={bookings}
    />
  );
}
