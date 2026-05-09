// POST /api/lms/quiz-coupon
//
// Issues a single-use Stripe promotion code (50 € off the Grundkurs
// Botulinum, expires in 5 days) tied to a user's email. Triggered by
// the QuizBlock client component after a perfect quiz score; the
// email is the gate the user fills before the code is revealed.
//
// Idempotency: one row per email. Re-submitting the same email
// returns the existing active code. If the existing code has
// expired, we delete the row, create a fresh Stripe coupon, and
// return the new code.
//
// Security: public endpoint, no auth. Uses service-role to write the
// registry. Email is validated and lowercased before any storage or
// Stripe call.
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;

const VOUCHER_AMOUNT_CENTS = 5000; // 50 EUR
const VOUCHER_CURRENCY = "eur";
const EXPIRY_DAYS = 5;

// 32-char alphabet, no 0/O/1/I/L to avoid OCR/typo confusion.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = randomBytes(8);
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `EPHIA-${suffix}`;
}

function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Stripe error: ${errText}`);
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  let payload: { email?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email =
    typeof payload.email === "string"
      ? payload.email.trim().toLowerCase()
      : "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 1. Existing row?
  const { data: existing, error: selectErr } = await supabase
    .from("lms_quiz_coupons")
    .select("code, expires_at")
    .eq("email", email)
    .maybeSingle();

  if (selectErr) {
    console.error("quiz-coupon select failed", selectErr);
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  const now = new Date();

  if (existing) {
    const expiresAt = new Date(existing.expires_at);
    if (expiresAt > now) {
      // Active code — same email, return existing without hitting Stripe.
      return NextResponse.json({
        code: existing.code,
        expiresAt: existing.expires_at,
        existing: true,
      });
    }
    // Expired — purge so we can issue a fresh code below.
    await supabase.from("lms_quiz_coupons").delete().eq("email", email);
  }

  // 2. Mint fresh Stripe coupon + promotion code with 5-day expiry.
  const code = generateCode();
  const expiresAtMs = now.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const expiresAtUnix = Math.floor(expiresAtMs / 1000);

  let stripeCoupon: { id: string };
  let stripePromo: { id: string };

  try {
    stripeCoupon = await stripePost("/coupons", {
      amount_off: String(VOUCHER_AMOUNT_CENTS),
      currency: VOUCHER_CURRENCY,
      duration: "once",
      max_redemptions: "1",
      "metadata[source]": "lms-quiz-tutorial",
      "metadata[email]": email,
    });

    stripePromo = await stripePost("/promotion_codes", {
      coupon: stripeCoupon.id,
      code,
      max_redemptions: "1",
      expires_at: String(expiresAtUnix),
    });
  } catch (e) {
    console.error("quiz-coupon stripe creation failed", e);
    return NextResponse.json({ error: "stripe_failed" }, { status: 500 });
  }

  // 3. Persist.
  const { error: insertErr } = await supabase
    .from("lms_quiz_coupons")
    .insert({
      email,
      code,
      stripe_coupon_id: stripeCoupon.id,
      stripe_promo_code_id: stripePromo.id,
      expires_at: new Date(expiresAtMs).toISOString(),
    });

  if (insertErr) {
    console.error("quiz-coupon insert failed", insertErr);
    // The Stripe coupon already exists at this point; we log and
    // continue rather than try to undo, since the user can still
    // redeem the code we'll return. The duplicate would only matter
    // if the user retried, in which case the unique constraint on
    // `code` (and the email PK) would protect us.
  }

  return NextResponse.json({
    code,
    expiresAt: new Date(expiresAtMs).toISOString(),
    existing: false,
  });
}
