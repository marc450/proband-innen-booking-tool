import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Inbox draft endpoint. Exists solely so the client can flush pending drafts
// during `pagehide` / tab close with `fetch(..., { keepalive: true })` —
// a plain Supabase JS call can't use keepalive and gets killed by the
// browser when the tab unloads, which was a silent data-loss path.
//
// Normal typing still persists through the Supabase client directly. This
// route is the safety net for the last keystrokes before close.
//
// Auth: uses the SSR cookie client to identify the user, then writes with the
// service role to keep the upsert logic server-side and avoid RLS surprises.

interface ComposeBody {
  kind: "compose";
  to?: string | null;
  subject?: string | null;
  body: string;
  cc?: string | null;
  bcc?: string | null;
}

interface ReplyBody {
  kind: "reply";
  threadId: string;
  body: string;
  cc?: string | null;
  bcc?: string | null;
  showCc?: boolean;
  showBcc?: boolean;
}

type SaveBody = ComposeBody | ReplyBody;

async function currentUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: SaveBody;
  try {
    payload = (await req.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (payload.kind === "compose") {
    const row = {
      user_id: userId,
      kind: "compose" as const,
      thread_id: null,
      to: payload.to ?? null,
      subject: payload.subject ?? null,
      body: payload.body ?? "",
      cc: payload.cc ?? null,
      bcc: payload.bcc ?? null,
      show_cc: false,
      show_bcc: false,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await admin
      .from("email_drafts")
      .upsert(row, { onConflict: "conflict_key" })
      .select("id")
      .single();
    if (error) {
      console.error("[inbox/draft] compose upsert failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data?.id });
  }

  if (payload.kind === "reply") {
    if (!payload.threadId) {
      return NextResponse.json({ error: "threadId required" }, { status: 400 });
    }
    const row = {
      user_id: userId,
      kind: "reply" as const,
      thread_id: payload.threadId,
      to: null,
      subject: null,
      body: payload.body ?? "",
      cc: payload.cc ?? null,
      bcc: payload.bcc ?? null,
      show_cc: !!payload.showCc,
      show_bcc: !!payload.showBcc,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await admin
      .from("email_drafts")
      .upsert(row, { onConflict: "conflict_key" })
      .select("id")
      .single();
    if (error) {
      console.error("[inbox/draft] reply upsert failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data?.id });
  }

  return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kind = req.nextUrl.searchParams.get("kind");
  const threadId = req.nextUrl.searchParams.get("threadId");
  if (kind !== "compose" && kind !== "reply") {
    return NextResponse.json({ error: "kind must be compose|reply" }, { status: 400 });
  }
  if (kind === "reply" && !threadId) {
    return NextResponse.json({ error: "threadId required for reply" }, { status: 400 });
  }

  const admin = createAdminClient();
  let query = admin.from("email_drafts").delete().eq("user_id", userId).eq("kind", kind);
  if (kind === "reply" && threadId) query = query.eq("thread_id", threadId);

  const { error } = await query;
  if (error) {
    console.error("[inbox/draft] delete failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
