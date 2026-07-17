// Zahlungsabgleich: does every PAID Stripe checkout session have the records it
// is supposed to have in our database? One pass of the daily sweep
// (/api/send-reminders), same shape as the Galderma export.
//
// This is deliberately NOT an error handler. Several webhook paths take money
// and then return HTTP 200 without doing the work, so Stripe never retries and
// nothing is logged anywhere a human looks. Instrumenting each of those only
// catches the failures we predicted. Comparing Stripe's truth against ours
// catches every one of them, plus the ones we haven't written yet, plus the
// SEPA case where `checkout.session.completed` fires days before the money
// actually settles.
//
// Stripe is the source of truth here, because Stripe's truth is the one the
// customer believes: they have a receipt.
//
// Scope: only sessions with payment_status === "paid". That deliberately
// excludes the Proband:innen funnel (mode: "setup", no charge, so nothing to
// reconcile) and every unpaid/expired/abandoned session (normal behaviour, and
// a customer who never paid is not a missing booking).
//
// Noise control: one row per problem session in payment_reconciliation_alerts
// (unique on the session id), so a session is alerted once and never again. A
// later run that finds the records present stamps resolved_at instead, which is
// the common case when a Stripe retry eventually succeeds.

import Stripe from "stripe";
import type { createAdminClient } from "@/lib/supabase/admin";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
// Failures belong somewhere staff actually look for broken things. Falls back
// to the courses channel so this works before a dedicated webhook exists.
const SLACK_WEBHOOK_URL =
  process.env.SLACK_WEBHOOK_URL_ALERTS || process.env.SLACK_WEBHOOK_URL_COURSES;

// How far back to look. Longer than the daily cadence on purpose: a skipped run
// must not create a permanent blind spot, and re-checking a healthy session is
// free. The alerts table stops the overlap from producing repeat alerts.
const LOOKBACK_HOURS = 72;
// Ignore very recent sessions: the webhook may still be in flight, or Stripe
// may still be retrying. Without this, every reconciliation run would report
// the last few minutes of normal traffic as broken.
const GRACE_MINUTES = 60;

type AlertKind =
  | "missing_booking"
  | "partial_curriculum"
  | "rebooking_not_applied"
  | "missing_merch_order"
  | "unrecognized_session";

interface Problem {
  sessionId: string;
  kind: AlertKind;
  expected: number | null;
  found: number | null;
  amountCents: number | null;
  currency: string | null;
  email: string | null;
  createdAt: string;
  notes: string;
}

export interface PaymentReconciliationResult {
  checked: number;
  problems: number;
  newAlerts: number;
  resolved: number;
  errors: number;
  /** Only populated on a dry run, for eyeballing what a real run would report. */
  details?: Array<Omit<Problem, "sessionId"> & { sessionId: string }>;
}

export interface PaymentReconciliationOptions {
  /** Scan and report, but write nothing and ping nobody. */
  dryRun?: boolean;
  /** Override the scan window. For a manual catch-up run after an incident. */
  lookbackHours?: number;
}

type Admin = ReturnType<typeof createAdminClient>;

async function countCourseBookings(admin: Admin, sessionId: string): Promise<number> {
  const { count, error } = await admin
    .from("course_bookings")
    .select("id", { count: "exact", head: true })
    .eq("stripe_checkout_session_id", sessionId);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Decide what SHOULD exist for a paid session, and whether it does.
 * Mirrors the dispatch in handleCheckoutCompleted (stripe-webhook route): if a
 * new checkout shape is added there without a branch here, it surfaces as
 * `unrecognized_session` rather than being silently trusted.
 */
async function classify(admin: Admin, s: Stripe.Checkout.Session): Promise<Problem | null> {
  const m = s.metadata || {};
  const base = {
    sessionId: s.id,
    amountCents: s.amount_total,
    currency: s.currency,
    email: s.customer_details?.email ?? null,
    createdAt: new Date(s.created * 1000).toISOString(),
  };

  // Merch shop → exactly one merch_orders row.
  if (m.orderType === "merch") {
    const { count, error } = await admin
      .from("merch_orders")
      .select("id", { count: "exact", head: true })
      .eq("stripe_checkout_session_id", s.id);
    if (error) throw error;
    if ((count ?? 0) >= 1) return null;
    return {
      ...base,
      kind: "missing_merch_order",
      expected: 1,
      found: 0,
      notes: "Bezahlte Merch-Bestellung ohne Datensatz in merch_orders.",
    };
  }

  // Curriculum bundle → one booking per course in the bundle. This is the one
  // shape where a PARTIAL result is possible: the handler loops in JS and
  // `continue`s past a failed RPC, and its idempotency guard then blocks any
  // repair on retry, because "a booking already exists" looks like success.
  if (m.curriculumSlug) {
    let expected = 0;
    try {
      expected = (JSON.parse(m.courseKeys || "[]") as string[]).length;
    } catch {
      expected = 0;
    }
    const found = await countCourseBookings(admin, s.id);
    if (expected > 0 && found >= expected) return null;
    // Unparseable metadata: we can't say how many were expected, but a paid
    // curriculum session with zero bookings is wrong regardless.
    if (expected === 0 && found > 0) return null;
    return {
      ...base,
      kind: found === 0 ? "missing_booking" : "partial_curriculum",
      expected: expected || null,
      found,
      notes:
        found === 0
          ? `Bezahltes Curriculum (${m.curriculumSlug}) ohne jede Buchung.`
          : `Bezahltes Curriculum (${m.curriculumSlug}): nur ${found} von ${expected} Kursen gebucht. Die Ärzt:in hat die Bestätigungsmail für alle ${expected} Kurse erhalten.`,
    };
  }

  // Umbuchungsgebühr → the request must have been applied.
  if (m.rebookingRequestId) {
    const { data, error } = await admin
      .from("course_rebooking_requests")
      .select("status")
      .eq("id", m.rebookingRequestId)
      .maybeSingle();
    if (error) throw error;
    if (data?.status === "applied") return null;
    return {
      ...base,
      kind: "rebooking_not_applied",
      expected: 1,
      found: 0,
      notes:
        `Umbuchungsgebühr bezahlt, aber die Umbuchung wurde nicht angewendet ` +
        `(Status: ${data?.status ?? "Anfrage nicht gefunden"}). Die Ärzt:in steht weiterhin auf ihrem alten Termin.`,
    };
  }

  // Multi-course invite → at least one booking. No count check needed: the RPC
  // creates every course in a single transaction, so a partial result is not
  // reachable.
  if (m.inviteToken && m.inviteMulti === "1") {
    const found = await countCourseBookings(admin, s.id);
    if (found >= 1) return null;
    return {
      ...base,
      kind: "missing_booking",
      expected: 1,
      found: 0,
      notes: "Bezahlte Einladungs-Buchung (mehrere Kurse) ohne Buchung.",
    };
  }

  // Single course booking → exactly one booking.
  if (m.courseKey) {
    const found = await countCourseBookings(admin, s.id);
    if (found >= 1) return null;
    return {
      ...base,
      kind: "missing_booking",
      expected: 1,
      found: 0,
      notes: `Bezahlte Kursbuchung (${m.courseKey}, ${m.courseType ?? "?"}) ohne Buchung.`,
    };
  }

  // Nothing matched. The webhook drops these silently (`if (!metadata.courseKey)
  // return;`), so if it is one of ours, someone paid for nothing. It may also be
  // a payment link created by hand in the Stripe dashboard, which is fine and
  // only needs a glance.
  return {
    ...base,
    kind: "unrecognized_session",
    expected: null,
    found: null,
    notes:
      "Bezahlte Stripe-Session, die zu keinem bekannten Checkout passt (keine passenden Metadaten). " +
      "Entweder manuell in Stripe angelegt oder ein Checkout, den der Webhook nicht kennt.",
  };
}

/**
 * Best-effort Slack ping. Returns false when the message did not go out, so
 * callers can count it: an alerting path that quietly does nothing is worse
 * than no alerting, because it buys false confidence.
 */
async function pingSlack(text: string): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    console.error(
      "reconcile-payments: no SLACK_WEBHOOK_URL_ALERTS or SLACK_WEBHOOK_URL_COURSES " +
        "configured, alert dropped:\n" +
        text,
    );
    return false;
  }
  try {
    const res = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`Slack responded ${res.status}: ${await res.text()}`);
    return true;
  } catch (err) {
    console.error("reconcile-payments: Slack ping failed:", err);
    return false;
  }
}

function fmtAmount(cents: number | null, currency: string | null): string {
  if (cents == null) return "?";
  return (cents / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
  });
}

export async function runPaymentReconciliation(
  admin: Admin,
  opts: PaymentReconciliationOptions = {},
): Promise<PaymentReconciliationResult> {
  const result: PaymentReconciliationResult = {
    checked: 0,
    problems: 0,
    newAlerts: 0,
    resolved: 0,
    errors: 0,
  };

  if (!STRIPE_SECRET_KEY) {
    console.error("reconcile-payments: STRIPE_SECRET_KEY missing, cannot reconcile");
    return { ...result, errors: 1 };
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const now = Date.now();
  const lookbackHours = opts.lookbackHours ?? LOOKBACK_HOURS;
  const gte = Math.floor((now - lookbackHours * 3600_000) / 1000);
  const lte = Math.floor((now - GRACE_MINUTES * 60_000) / 1000);

  const problems: Problem[] = [];
  const healthySessionIds: string[] = [];

  try {
    for await (const s of stripe.checkout.sessions.list({
      created: { gte, lte },
      limit: 100,
    })) {
      // Only money that actually moved. For SEPA this is also the correct
      // gate: payment_status flips to "paid" only once the debit settles, so
      // a pending SEPA session is simply checked again on a later run.
      if (s.payment_status !== "paid") continue;
      result.checked += 1;

      // Per-session, so one transient DB hiccup costs us that session and not
      // the whole run. An aborted run reports nothing, which looks exactly
      // like a clean bill of health.
      try {
        const problem = await classify(admin, s);
        if (problem) problems.push(problem);
        else healthySessionIds.push(s.id);
      } catch (err) {
        console.error(`reconcile-payments: could not classify ${s.id}:`, err);
        result.errors += 1;
      }
    }
  } catch (err) {
    // The Stripe listing itself failed: we have no idea what is out there, so
    // this run proves nothing. Say so loudly rather than return a quiet zero.
    console.error("reconcile-payments: Stripe scan failed:", err);
    await pingSlack(
      "⚠️ *Zahlungsabgleich konnte nicht laufen*\n" +
        "Die Stripe-Abfrage ist fehlgeschlagen, es wurde nichts geprüft. " +
        "Bis zum nächsten erfolgreichen Lauf würden fehlende Buchungen nicht auffallen.",
    );
    return { ...result, errors: result.errors + 1 };
  }

  result.problems = problems.length;

  if (opts.dryRun) {
    console.log(
      `reconcile-payments (dry run): ${result.checked} paid session(s) checked, ` +
        `${result.problems} problem(s) would be reported`,
    );
    return { ...result, details: problems };
  }

  // Close out anything that has since been fixed, whether by a Stripe retry or
  // by hand. Keeps the channel quiet and leaves the row as an audit trail.
  if (healthySessionIds.length > 0) {
    const { data: resolved, error: resolveErr } = await admin
      .from("payment_reconciliation_alerts")
      .update({ resolved_at: new Date().toISOString() })
      .in("stripe_checkout_session_id", healthySessionIds)
      .is("resolved_at", null)
      .select("id");
    if (resolveErr) {
      console.error("reconcile-payments: could not resolve alerts:", resolveErr);
      result.errors += 1;
    } else {
      result.resolved = resolved?.length ?? 0;
    }
  }

  // Record each problem. The unique constraint on the session id is what makes
  // this alert once: an ignoreDuplicates upsert turns the second sighting into
  // a no-op rather than a repeat ping.
  const fresh: Problem[] = [];
  for (const p of problems) {
    const { data, error } = await admin
      .from("payment_reconciliation_alerts")
      .upsert(
        {
          stripe_checkout_session_id: p.sessionId,
          kind: p.kind,
          expected_records: p.expected,
          found_records: p.found,
          amount_total_cents: p.amountCents,
          currency: p.currency,
          customer_email: p.email,
          session_created_at: p.createdAt,
          notes: p.notes,
        },
        { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true },
      )
      .select("id");

    if (error) {
      console.error(`reconcile-payments: could not record alert for ${p.sessionId}:`, error);
      result.errors += 1;
      continue;
    }
    // Empty array = the row already existed = already alerted.
    if (data && data.length > 0) fresh.push(p);
  }

  result.newAlerts = fresh.length;

  console.log(
    `reconcile-payments: ${result.checked} paid session(s) checked, ` +
      `${result.problems} problem(s), ${result.newAlerts} new, ${result.resolved} resolved`,
  );

  // A run that couldn't check some sessions is not a clean run. Say so, or the
  // silence reads as "all good".
  if (result.errors > 0) {
    const ok = await pingSlack(
      `⚠️ *Zahlungsabgleich unvollständig*\n` +
        `${result.errors} Session(s) konnten nicht geprüft werden. ` +
        "Fehlende Buchungen könnten darunter sein. Details im Railway-Log.",
    );
    if (!ok) result.errors += 1;
  }

  if (fresh.length === 0) return result;

  {
    const lines = fresh.map((p) => {
      // Strip Slack mrkdwn control chars, but keep @ so the address stays
      // usable: staff need to be able to copy it and reach the customer.
      const who = (p.email || "unbekannt").replace(/[*_<>]/g, "").slice(0, 200);
      return (
        `• *${fmtAmount(p.amountCents, p.currency)}* — ${who}\n` +
        `   ${p.notes}\n` +
        `   <https://dashboard.stripe.com/payments/${p.sessionId}|In Stripe öffnen> · \`${p.sessionId}\``
      );
    });

    const ok = await pingSlack(
      [
        `🚨 *Zahlungsabgleich: ${fresh.length} bezahlte Session(s) ohne vollständige Buchung*`,
        "Diese Kund:innen haben bezahlt. Bitte prüfen und aktiv auf sie zugehen.",
        "",
        ...lines,
      ].join("\n"),
    );
    if (!ok) result.errors += 1;
  }

  return result;
}
