import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/gmail";

// Maps the short ?account= query param to the actual Gmail address. Adding a
// new mailbox = add a row here, then trigger /api/gmail/authorize?account=<key>.
const ACCOUNTS: Record<string, string> = {
  customerlove: "customerlove@ephia.de",
  invoice: "invoice@ephia.de",
};

export async function GET(request: NextRequest) {
  const account = request.nextUrl.searchParams.get("account") ?? "customerlove";
  const email = ACCOUNTS[account];
  if (!email) {
    return NextResponse.json(
      { error: `Unknown account "${account}". Allowed: ${Object.keys(ACCOUNTS).join(", ")}` },
      { status: 400 },
    );
  }
  // Round-trip the email through Google's `state` so the callback can upsert
  // the resulting tokens against the correct mailbox.
  return NextResponse.redirect(getAuthUrl({ loginHint: email, state: email }));
}
