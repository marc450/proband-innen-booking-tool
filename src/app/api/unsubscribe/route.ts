import { NextRequest, NextResponse } from "next/server";
import { parseContactKey, applyOptOut } from "@/lib/unsubscribe";

/**
 * One-click opt-out endpoint.
 *
 * Hit by two flows:
 * 1. The /abmelden page's "Ja, abmelden" button (fetch POST from the
 *    browser, expects JSON response).
 * 2. Mail clients honoring RFC 8058 (Gmail, Apple Mail) via the
 *    `List-Unsubscribe-Post` header. They POST `List-Unsubscribe=One-Click`
 *    as form data and expect a 2xx; the response body is ignored.
 *
 * The same `?id=p-<uuid>` or `?id=a-<uuid>` query parameter drives
 * both. Always returns 200 (or 400 for malformed IDs) to avoid
 * leaking whether a given key matches a real contact.
 */
export async function POST(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const key = parseContactKey(id);
  if (!key) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const ok = await applyOptOut(key);
  if (!ok) {
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
