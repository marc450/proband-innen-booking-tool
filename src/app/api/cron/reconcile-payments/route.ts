import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPaymentReconciliation } from "@/lib/run-payment-reconciliation";

// Manual / standalone trigger for the Zahlungsabgleich. It normally runs as one
// pass of the daily sweep (/api/send-reminders, the daily-reminders-and-certs
// cron), so no dedicated Railway cron service is needed. This route stays
// available for an on-demand run (e.g. right after a webhook incident) and is
// CRON_SECRET-gated like the other crons.
//
// Safe to run repeatedly: it only reads Stripe, and each problem session is
// alerted exactly once (unique on stripe_checkout_session_id).
//
// POST ?dry=1 scans and returns what it WOULD report, without writing an alert
// row or pinging Slack.

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = new URL(req.url).searchParams.get("dry") === "1";
  const result = await runPaymentReconciliation(createAdminClient(), { dryRun });
  return NextResponse.json(result);
}
