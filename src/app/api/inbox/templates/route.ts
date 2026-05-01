import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Read-only template list for the inbox compose flow. Any authenticated
// staff can pick a template; the admin-only CRUD lives at
// /api/admin/email-templates. RLS on email_templates already grants
// SELECT to authenticated, so we use the user-scoped client (not the
// admin client) and let the database enforce the policy.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("email_templates")
    .select("id, name, subject, body_html")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
