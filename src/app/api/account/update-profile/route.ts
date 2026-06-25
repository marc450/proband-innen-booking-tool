import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedAccess } from "@/lib/auth-verify";
import { normalizeTitle } from "@/lib/utils";

// Customer self-service profile edit for /mein-konto.
//
// The caller can only ever edit their OWN auszubildende row: we resolve
// the contact by user_id from the *verified* session (getVerifiedAccess
// validates the JWT against the Supabase auth server), never from a
// client-supplied id. Writes target the `auszubildende` table directly
// (the v_auszubildende view is read-only); the admin dashboard reads the
// same table, so edits show up there immediately.
//
// Email is intentionally NOT editable here: it's the auth login and the
// booking-dedup key, so changing it needs a separate verified flow.

const MAX = 200;

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX);
}

export async function POST(req: NextRequest) {
  try {
    const access = await getVerifiedAccess();
    if (!access) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Resolve the contact strictly by the verified user id. No client
    // input decides which row is touched.
    const { data: contact, error: contactErr } = await admin
      .from("auszubildende")
      .select("id")
      .eq("user_id", access.userId)
      .maybeSingle();

    if (contactErr) {
      console.error("[update-profile] contact lookup failed:", contactErr);
      return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
    }
    if (!contact) {
      return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
    }

    const firstName = clean(body.firstName);
    const lastName = clean(body.lastName);
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "Vor- und Nachname sind erforderlich." },
        { status: 400 },
      );
    }

    const rawTitle = clean(body.title);

    const update = {
      first_name: firstName,
      last_name: lastName,
      title: rawTitle ? normalizeTitle(rawTitle) : null,
      company_name: clean(body.companyName),
      vat_id: clean(body.vatId),
      address_line1: clean(body.addressLine1),
      address_postal_code: clean(body.addressPostalCode),
      address_city: clean(body.addressCity),
      address_country: clean(body.addressCountry),
    };

    const { error: updateErr } = await admin
      .from("auszubildende")
      .update(update)
      .eq("id", contact.id);

    if (updateErr) {
      console.error("[update-profile] update failed:", updateErr);
      return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, profile: update });
  } catch (err) {
    console.error("[update-profile] unexpected error:", err);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
