import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendPasswordSetupLinkByEmail } from "@/lib/password-setup";

// Public: (re)send a set-password link to a known customer's email.
// Used by the /start "needs_password" step for doctors who never got (or
// lost) the link that ships in their course confirmation email.
//
// Always returns 200 so it can't be used to probe which addresses are
// customers, mirroring request-customer-password-reset. sendPassword-
// SetupLinkByEmail only sends for a known auszubildende that has no
// account yet; everything else is a silent no-op.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const rl = checkRateLimit(`setup-link-send:${ip}`, [
    { windowMs: 60_000, max: 5 },
    { windowMs: 3_600_000, max: 30 },
  ]);
  if (!rl.ok) {
    // Treat as sent — never reveal throttling to the caller.
    return NextResponse.json({ ok: true });
  }

  let email = "";
  try {
    const body = await req.json();
    if (typeof body?.email === "string") email = body.email.trim().toLowerCase();
  } catch {
    return NextResponse.json({ ok: true });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: true });
  }

  try {
    await sendPasswordSetupLinkByEmail(email);
  } catch (err) {
    console.error("send-password-setup-link failed:", err);
  }
  return NextResponse.json({ ok: true });
}
