import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireVerifiedInbox } from "@/lib/auth-verify";

// Read-only template list for the inbox compose flow. Any authenticated
// staff can pick a template; the admin-only CRUD lives at
// /api/admin/email-templates. RLS on email_templates already grants
// SELECT to authenticated, so we use the user-scoped client (not the
// admin client) and let the database enforce the policy.

export async function GET() {
  // Verified inbox gate — email_templates RLS grants SELECT to any
  // authenticated role, so without this a public student could read them.
  if (!(await requireVerifiedInbox())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("id, name, subject, body_html")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
