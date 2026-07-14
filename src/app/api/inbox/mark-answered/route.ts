import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVerifiedInbox } from "@/lib/auth-verify";

// Manuelles "Als beantwortet markieren" für die Admin-Inbox. Gmail
// hat keinen "handled"-Status, also persistieren wir den hier.
// Auth: SSR-Cookie-Client identifiziert den Staff-User, die Schreib-
// Operation läuft über den Service-Role-Client. Display-Name wird
// aus `profiles` (title + first_name + last_name) zusammengebaut, mit
// E-Mail-Fallback falls profile leer.

async function resolveCurrentUser() {
  // Verified inbox gate (admin OR kursbetreuung) — a valid session alone
  // is not enough, so a public student account cannot mark threads.
  const access = await requireVerifiedInbox();
  if (!access) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, title")
    .eq("id", access.userId)
    .maybeSingle();

  const parts = [profile?.title, profile?.first_name, profile?.last_name].filter(Boolean);
  const displayName = parts.length ? parts.join(" ") : "Unbekannt";

  return { id: access.userId, displayName };
}

export async function POST(req: NextRequest) {
  const me = await resolveCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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
