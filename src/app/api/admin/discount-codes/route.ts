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
  coupon: {
    id: string;
    percent_off: number | null;
    name: string | null;
  };
}

export async function GET() {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const data = await stripeFetch(
      "/promotion_codes?limit=100&expand[]=data.coupon"
    );
    const codes = (data.data as StripePromotionCode[]).map((p) => ({
      id: p.id,
      code: p.code,
      active: p.active,
      times_redeemed: p.times_redeemed,
      max_redemptions: p.max_redemptions,
      percent_off: p.coupon?.percent_off ?? null,
      created: p.created,
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

  const { code, percentOff, maxRedemptions } = await req.json();

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

  const pct = Number(percentOff);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
    return NextResponse.json(
      { error: "Prozentsatz muss zwischen 1 und 100 liegen." },
      { status: 400 }
    );
  }

  const max = maxRedemptions === "" || maxRedemptions == null ? null : Number(maxRedemptions);
  if (max !== null && (!Number.isFinite(max) || max < 1)) {
    return NextResponse.json(
      { error: "Max. Einlösungen muss eine positive Zahl sein." },
      { status: 400 }
    );
  }

  try {
    // 1. Create coupon
    const couponBody: Record<string, string> = {
      percent_off: String(pct),
      duration: "once",
      name: normalizedCode,
    };
    if (max !== null) couponBody.max_redemptions = String(max);

    const coupon = await stripeFetch("/coupons", {
      method: "POST",
      body: couponBody,
    });

    // 2. Create promotion code referencing the coupon
    const promoBody: Record<string, string> = {
      coupon: coupon.id,
      code: normalizedCode,
    };

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
      percent_off: pct,
      created: promo.created,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fehler beim Erstellen";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
