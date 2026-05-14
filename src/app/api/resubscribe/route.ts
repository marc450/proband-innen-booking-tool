import { NextRequest, NextResponse } from "next/server";
import { parseContactKey, applyResubscribe } from "@/lib/unsubscribe";

/**
 * Re-subscribe endpoint. Reached only from the "Doch wieder
 * anmelden" button on the post-opt-out confirmation page. Only
 * flips status back when the row was set to 'inactive' via the
 * opt-out flow (unsubscribed_at IS NOT NULL), so accidental
 * reactivation of staff-managed deactivations can't happen.
 */
export async function POST(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const key = parseContactKey(id);
  if (!key) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const ok = await applyResubscribe(key);
  if (!ok) {
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
