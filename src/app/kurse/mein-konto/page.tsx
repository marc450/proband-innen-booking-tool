import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MeinKontoView } from "./mein-konto-view";

// Customer-facing dashboard. Server component pulls the auszubildende
// row by user_id (set during set-password) and the legacy_bookings list,
// hands them to the client view for display.
//
// v1 is intentionally minimal: name greeting + a static list of past
// bookings. The richer features — LW course progress + certificates via
// API, click-to-launch SSO, basket, curricula UI — come in follow-up
// commits once the foundation is verified end-to-end.
export const metadata: Metadata = {
  title: "Mein Konto | EPHIA",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://ephia.de/mein-konto" },
};

export const dynamic = "force-dynamic";

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

  let legacyBookings: Array<{
    id: string;
    product_name: string;
    course_date: string | null;
    purchased_at: string | null;
    source: string;
  }> = [];

  if (contact) {
    const { data } = await admin
      .from("legacy_bookings")
      .select("id, product_name, course_date, purchased_at, source")
      .eq("auszubildende_id", contact.id)
      .order("purchased_at", { ascending: false, nullsFirst: false });
    legacyBookings = data ?? [];
  }

  return (
    <MeinKontoView
      firstName={contact?.first_name ?? null}
      email={contact?.email ?? user.email ?? ""}
      legacyBookings={legacyBookings}
    />
  );
}
