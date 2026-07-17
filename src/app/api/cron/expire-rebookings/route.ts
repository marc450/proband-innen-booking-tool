import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runRebookingExpiry } from "@/lib/run-rebooking-expiry";

// Manual / standalone trigger for the Umbuchungs-Reaper. It normally runs as
// one pass of the daily sweep (/api/send-reminders, the daily-reminders-and-certs
// cron), so no dedicated Railway cron service is needed. This route stays
// available for an on-demand run and is CRON_SECRET-gated like the other crons.
// Idempotent: only ever picks up requests that are still pending AND still
// holding seats.

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runRebookingExpiry(createAdminClient());
  return NextResponse.json(result);
}
