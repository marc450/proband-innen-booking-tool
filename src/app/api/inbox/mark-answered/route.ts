import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Manuelles "Als beantwortet markieren" für die Admin-Inbox. Gmail
// hat keinen "handled"-Status, also persistieren wir den hier.
// Auth: SSR-Cookie-Client identifiziert den Staff-User, die Schreib-
// Operation läuft über den Service-Role-Client. Display-Name wird
// aus `profiles` (title + first_name + last_name) zusammengebaut, mit
// E-Mail-Fallback falls profile leer.

async function resolveCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, title")
    .eq("id", user.id)
    .maybeSingle();

  const parts = [profile?.title, profile?.first_name, profile?.last_name].filter(Boolean);
  const displayName = parts.length ? parts.join(" ") : (user.email || "Unbekannt");

  return { id: user.id, displayName };
}

export async function POST(req: NextRequest) {
  const me = await resolveCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let threadId: string;
  try {
    const body = await req.json();
    threadId = String(body?.threadId || "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!threadId) {
    return NextResponse.json({ error: "threadId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("inbox_thread_marks")
    .upsert(
      {
        thread_id: threadId,
        marked_by_user_id: me.id,
        marked_by_name: me.displayName,
        marked_at: new Date().toISOString(),
      },
      { onConflict: "thread_id" },
    );

  if (error) {
    console.error("inbox/mark-answered upsert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    manuallyAnsweredBy: me.displayName,
    manuallyAnsweredAt: new Date().toISOString(),
  });
}

export async function DELETE(req: NextRequest) {
  const me = await resolveCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threadId = (req.nextUrl.searchParams.get("threadId") || "").trim();
  if (!threadId) {
    return NextResponse.json({ error: "threadId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("inbox_thread_marks")
    .delete()
    .eq("thread_id", threadId);

  if (error) {
    console.error("inbox/mark-answered delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
