import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runGaldermaExport } from "@/lib/run-galderma-export";

// Manual / standalone trigger for the Galderma export. The export normally
// runs as one pass of the daily sweep (/api/send-reminders, the
// daily-reminders-and-certs cron), so no dedicated Railway cron service is
// needed. This route stays available for an on-demand re-run and is
// CRON_SECRET-gated like the other crons. Idempotent via exported_at.

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runGaldermaExport(createAdminClient());
  return NextResponse.json(result);
}
