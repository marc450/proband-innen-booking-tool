import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "admin") return user;
  return null;
}

async function stripeFetch(
  endpoint: string,
  init: { method: "GET" | "POST"; body?: Record<string, string> } = { method: "GET" }
) {
  const url = `https://api.stripe.com/v1${endpoint}`;
  const res = await fetch(url, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: init.body ? new URLSearchParams(init.body).toString() : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Stripe error ${res.status}`);
  }
  return json;
}

interface StripePromotionCode {
  id: string;
  code: string;
  active: boolean;
  times_redeemed: number;
  max_redemptions: number | null;
  created: number;
  metadata?: Record<string, string>;
  coupon: {
    id: string;
    percent_off: number | null;
    amount_off: number | null;
    currency: string | null;
    name: string | null;
    deleted?: boolean;
  } | null;
}

export async function GET() {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const data = await stripeFetch(
      "/promotion_codes?limit=100&expand[]=data.coupon"
    );
    const codes = (data.data as StripePromotionCode[])
      // Filter out codes we have soft-deleted. The metadata flag is the
      // reliable signal — Stripe still returns the cached coupon object on
      // the promotion code even after the coupon itself has been deleted.
      .filter(
        (p) =>
          p.metadata?.deleted !== "true" &&
          p.coupon &&
          !p.coupon.deleted
      )
      .map((p) => ({
        id: p.id,
        code: p.code,
        active: p.active,
        times_redeemed: p.times_redeemed,
        max_redemptions: p.max_redemptions,
        percent_off: p.coupon?.percent_off ?? null,
        // Stripe amount_off is the smallest currency unit (cents for EUR).
        amount_off: p.coupon?.amount_off ?? null,
        currency: p.coupon?.currency ?? null,
        created: p.created,
        created_by: p.metadata?.created_by || null,
      }));
    return NextResponse.json(codes);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fehler beim Laden";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  // Get creator name for metadata
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();
  const creatorName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ")
    : user.email || "Unbekannt";

  const { code, discountType, percentOff, amountOffEur, maxRedemptions } = await req.json();

  if (!code || typeof code !== "string" || code.trim().length < 3) {
    return NextResponse.json(
      { error: "Code muss mindestens 3 Zeichen lang sein." },
      { status: 400 }
    );
  }
  const normalizedCode = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(normalizedCode)) {
    return NextResponse.json(
      { error: "Nur Buchstaben, Zahlen, - und _ erlaubt." },
      { status: 400 }
    );
  }

  // Two mutually-exclusive discount shapes:
  //   percent: 1–100 percent off the invoice
  //   amount:  fixed EUR amount off the invoice (we convert to cents for Stripe)
  const type: "percent" | "amount" =
    discountType === "amount" ? "amount" : "percent";

  let pct = 0;
  let amountCents = 0;
  if (type === "percent") {
    pct = Number(percentOff);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      return NextResponse.json(
        { error: "Prozentsatz muss zwischen 1 und 100 liegen." },
        { status: 400 }
      );
    }
  } else {
    const eur = Number(amountOffEur);
    if (!Number.isFinite(eur) || eur <= 0) {
      return NextResponse.json(
        { error: "Rabattbetrag muss eine positive Zahl sein." },
        { status: 400 }
      );
    }
    // Round to whole cents to avoid floating point drift at the boundary.
    amountCents = Math.round(eur * 100);
    if (amountCents < 1) {
      return NextResponse.json(
        { error: "Rabattbetrag muss mindestens 0,01 € betragen." },
        { status: 400 }
      );
    }
  }

  const max = maxRedemptions === "" || maxRedemptions == null ? null : Number(maxRedemptions);
  if (max !== null && (!Number.isFinite(max) || max < 1)) {
    return NextResponse.json(
      { error: "Max. Einlösungen muss eine positive Zahl sein." },
      { status: 400 }
    );
  }

  try {
    // 1. Create coupon (no max_redemptions here — that caps the coupon across
    // ALL promotion codes; we want the cap on THIS promotion code instead)
    const couponBody: Record<string, string> = {
      duration: "once",
      name: normalizedCode,
    };
    if (type === "percent") {
      couponBody.percent_off = String(pct);
    } else {
      couponBody.amount_off = String(amountCents);
      couponBody.currency = "eur";
    }

    const coupon = await stripeFetch("/coupons", {
      method: "POST",
      body: couponBody,
    });

    // 2. Create promotion code referencing the coupon, with max_redemptions
    // set on the promotion code itself so the user-facing redemption limit
    // actually takes effect.
    const promoBody: Record<string, string> = {
      coupon: coupon.id,
      code: normalizedCode,
      "metadata[created_by]": creatorName,
    };
    if (max !== null) promoBody.max_redemptions = String(max);

    const promo = await stripeFetch("/promotion_codes", {
      method: "POST",
      body: promoBody,
    });

    return NextResponse.json({
      id: promo.id,
      code: promo.code,
      active: promo.active,
      times_redeemed: promo.times_redeemed,
      max_redemptions: promo.max_redemptions,
      percent_off: type === "percent" ? pct : null,
      amount_off: type === "amount" ? amountCents : null,
      currency: type === "amount" ? "eur" : null,
      created: promo.created,
      created_by: creatorName,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fehler beim Erstellen";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
