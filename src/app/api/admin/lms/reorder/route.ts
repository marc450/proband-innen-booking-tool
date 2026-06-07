// Batch reorder: writes order_index = position for an ordered list of
// ids within one of the three LMS tables. Admin-only.
//
// Body: { kind: "courses" | "chapters" | "lessons", ids: string[] }
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertLmsAdmin } from "@/lib/lms/admin-auth";
import { LMS_TABLES, badRequest, dbError, unauthorized, type LmsTableKey } from "@/lib/lms/admin-api";

export async function POST(req: NextRequest) {
  if (!(await assertLmsAdmin())) return unauthorized();

  const body = await req.json();
  const kind = body.kind as LmsTableKey;
  const ids = body.ids;

  if (!(kind in LMS_TABLES)) return badRequest("Unbekannter Typ.");
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) {
    return badRequest("ids muss eine Liste von IDs sein.");
  }

  const admin = createAdminClient();
  const table = LMS_TABLES[kind];

  // Sequential updates keep it simple and correct; lists are short
  // (chapters/lessons per parent), so the round trips are cheap.
  for (let i = 0; i < ids.length; i++) {
    const { error } = await admin.from(table).update({ order_index: i }).eq("id", ids[i]);
    if (error) return dbError(error);
  }

  return NextResponse.json({ ok: true });
}
