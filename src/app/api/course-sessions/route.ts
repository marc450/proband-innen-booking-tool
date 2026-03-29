import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const templateId = req.nextUrl.searchParams.get("templateId");
  if (!templateId) {
    return NextResponse.json({ error: "templateId required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: sessions } = await supabase
    .from("course_sessions")
    .select("*")
    .eq("template_id", templateId)
    .eq("is_live", true)
    .order("date_iso", { ascending: true });

  return NextResponse.json({ sessions: sessions ?? [] });
}
