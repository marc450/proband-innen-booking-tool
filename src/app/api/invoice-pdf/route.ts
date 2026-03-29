import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Proxy Stripe invoice PDFs with Content-Disposition: inline
// so they can be displayed in an iframe without triggering download
export async function GET(req: NextRequest) {
  // Auth check: only staff can access
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url || !url.startsWith("https://")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Only allow Stripe PDF URLs
  const allowed = url.includes("stripe.com") || url.includes("pay.stripe.com");
  if (!allowed) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  try {
    const pdfRes = await fetch(url);
    if (!pdfRes.ok) {
      return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 502 });
    }

    const pdfBuffer = await pdfRes.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 500 });
  }
}
