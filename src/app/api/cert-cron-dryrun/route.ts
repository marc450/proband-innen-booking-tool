import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { previewPostPraxisCertificates } from "@/lib/send-post-praxis-certificate";

/**
 * GET /api/cert-cron-dryrun?date=YYYY-MM-DD
 *
 * Admin-only. Walks the same data the post-praxis cron would on the
 * day after the given session date, but never sends an email or
 * writes cert_sent_at. Returns each booking's cert routing decision
 * so we can verify dentists pick up the Zahnmedizin cert and
 * Humanmediziner:innen pick up the regular cert.
 */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const date = req.nextUrl.searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "date muss im Format YYYY-MM-DD sein." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  try {
    const rows = await previewPostPraxisCertificates(supabase, { dateIso: date });
    return NextResponse.json({ ok: true, date, rows });
  } catch (err) {
    console.error("cert dry-run failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Dry-Run fehlgeschlagen.",
      },
      { status: 500 },
    );
  }
}
