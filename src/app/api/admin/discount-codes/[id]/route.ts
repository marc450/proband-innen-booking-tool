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

  if (profile?.role === "admin") return user;
  return null;
}

async function stripePost(endpoint: string, body: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Stripe error ${res.status}`);
  return json;
}

async function stripeGet(endpoint: string) {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Stripe error ${res.status}`);
  return json;
}

async function stripeDelete(endpoint: string) {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Stripe error ${res.status}`);
  return json;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const { active } = await req.json();

  try {
    const updated = await stripePost(`/promotion_codes/${id}`, {
      active: active ? "true" : "false",
    });
    return NextResponse.json({ id: updated.id, active: updated.active });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fehler";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Stripe does not allow deleting promotion codes. To "delete" we:
//   1. Deactivate the promotion code so it cannot be redeemed anymore
//   2. Mark it with metadata[deleted]=true so the GET endpoint can hide it
//   3. Delete the underlying coupon as a belt-and-suspenders safeguard
// The metadata flag is the reliable hiding mechanism — we used to rely on
// the expanded coupon being returned as a deleted stub, but Stripe keeps
// returning the full coupon object on the promotion code after deletion.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;

  try {
    // 1. Look up the promotion code to find its coupon id
    const promo = await stripeGet(`/promotion_codes/${id}`);
    const couponId: string | undefined = promo?.coupon?.id;

    // 2. Deactivate and tag with deleted metadata so the list hides it
    await stripePost(`/promotion_codes/${id}`, {
      active: "false",
      "metadata[deleted]": "true",
      "metadata[deleted_at]": String(Math.floor(Date.now() / 1000)),
    });

    // 3. Delete the underlying coupon — permanently invalidates the code
    if (couponId) {
      try {
        await stripeDelete(`/coupons/${couponId}`);
      } catch (couponErr) {
        // Coupon may already be gone; log and continue
        console.warn("Coupon delete failed:", couponErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fehler beim Löschen";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
