import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/email-normalize";

/**
 * POST /api/admin/restore-gmail-addresses
 *
 * One-off recovery endpoint: an earlier email-normalisation migration
 * stripped dots from the local parts of every `@gmail.com` auszubildende
 * row. The stored form is still fully functional (Gmail ignores dots)
 * but the display form was lost. Stripe captures the exact email the
 * customer typed at checkout, so this endpoint walks each auszubildende
 * with a @gmail.com address, pulls the original email from the most
 * recent Stripe checkout session, and proposes an update.
 *
 * Safety rails:
 *   - Admin-auth gated.
 *   - Dry-run by default. Pass `{ "apply": true }` in the JSON body to
 *     actually write the UPDATE.
 *   - Only touches rows where normalizeEmail(stripeEmail) === currentDb
 *     (so we never overwrite a legitimately different address).
 *   - Skips rows where the Stripe email already matches the DB value
 *     (nothing to restore) or contains no dots (nothing was stripped).
 */
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
  if (!profile || profile.role !== "admin") return null;
  return user;
}

async function stripeGet(endpoint: string) {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Stripe ${res.status}`);
  return json;
}

type Proposal = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  current_email: string;
  proposed_email: string;
  source_session: string;
};

type Skipped = {
  id: string;
  email: string;
  reason: string;
};

export async function POST(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const apply = body?.apply === true;

  const admin = createAdminClient();

  // Load all gmail.com auszubildende. (Other providers were never
  // touched by the migration, so we don't scan them.)
  const { data: rows, error } = await admin
    .from("auszubildende")
    .select("id, email, first_name, last_name")
    .ilike("email", "%@gmail.com");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const proposals: Proposal[] = [];
  const skipped: Skipped[] = [];

  for (const row of rows ?? []) {
    // For each azubi, find their most recent course_bookings row with a
    // checkout session id. Oldest-first would also work; pick newest so
    // we use the most recent spelling the customer offered at Stripe.
    const { data: booking } = await admin
      .from("course_bookings")
      .select("stripe_checkout_session_id")
      .eq("auszubildende_id", row.id)
      .not("stripe_checkout_session_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!booking?.stripe_checkout_session_id) {
      skipped.push({ id: row.id, email: row.email, reason: "no Stripe session" });
      continue;
    }

    let stripeEmail: string | null = null;
    try {
      const session = await stripeGet(`/checkout/sessions/${booking.stripe_checkout_session_id}`);
      stripeEmail = session?.customer_details?.email || session?.customer_email || null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      skipped.push({ id: row.id, email: row.email, reason: `Stripe fetch failed: ${msg}` });
      continue;
    }

    if (!stripeEmail) {
      skipped.push({ id: row.id, email: row.email, reason: "Stripe session has no customer email" });
      continue;
    }

    const trimmedStripe = stripeEmail.trim();
    if (trimmedStripe.toLowerCase() === row.email) {
      // Already matches — nothing to restore (likely an address with no
      // dots in the local part, or one booked after the normalisation
      // landed).
      skipped.push({ id: row.id, email: row.email, reason: "Stripe email already matches DB" });
      continue;
    }

    // Safety: only accept the Stripe email if, after our own
    // normalisation, it collapses to the currently-stored value. That
    // guarantees we're restoring the same mailbox, not silently
    // replacing it with a different address.
    if (normalizeEmail(trimmedStripe) !== row.email) {
      skipped.push({
        id: row.id,
        email: row.email,
        reason: `Stripe email (${trimmedStripe}) does not normalise to current DB value`,
      });
      continue;
    }

    proposals.push({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      current_email: row.email,
      proposed_email: trimmedStripe,
      source_session: booking.stripe_checkout_session_id,
    });
  }

  // Dry-run unless the caller passed apply:true
  if (!apply) {
    return NextResponse.json({
      dryRun: true,
      totalGmailRows: (rows ?? []).length,
      proposals,
      skipped,
      hint: "POST again with { apply: true } to actually update these rows.",
    });
  }

  // Apply proposals one-by-one so one failure doesn't abort the rest.
  const applied: Proposal[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const p of proposals) {
    const { error: updErr } = await admin
      .from("auszubildende")
      .update({ email: p.proposed_email })
      .eq("id", p.id);
    if (updErr) {
      failed.push({ id: p.id, error: updErr.message });
    } else {
      applied.push(p);
    }
  }

  return NextResponse.json({
    dryRun: false,
    totalGmailRows: (rows ?? []).length,
    applied,
    failed,
    skipped,
  });
}
