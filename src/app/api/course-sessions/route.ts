import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const templateId = req.nextUrl.searchParams.get("templateId");
  if (!templateId) {
    return NextResponse.json({ error: "templateId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Check if this template shares sessions with another
  const SESSION_SHARING: Record<string, string> = {
    grundkurs_botulinum_zahnmedizin: "grundkurs_botulinum",
  };

  let sessionTemplateId = templateId;
  const { data: tmpl } = await supabase
    .from("course_templates")
    .select("course_key")
    .eq("id", templateId)
    .single();

  if (tmpl?.course_key && SESSION_SHARING[tmpl.course_key]) {
    const { data: sharedTmpl } = await supabase
      .from("course_templates")
      .select("id")
      .eq("course_key", SESSION_SHARING[tmpl.course_key])
      .single();
    if (sharedTmpl) sessionTemplateId = sharedTmpl.id;
  }

  const { data: sessions } = await supabase
    .from("course_sessions")
    .select("*")
    .eq("template_id", sessionTemplateId)
    .eq("is_live", true)
    .order("date_iso", { ascending: true });

  return NextResponse.json({ sessions: sessions ?? [] });
}
