import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, saveTokens } from "@/lib/gmail";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code parameter" }, { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
    // Redirect to inbox after successful auth
    return NextResponse.redirect(new URL("/dashboard/inbox", request.url));
  } catch (error) {
    console.error("Gmail OAuth callback error:", error);
    return NextResponse.json({ error: "Failed to connect Gmail" }, { status: 500 });
  }
}
