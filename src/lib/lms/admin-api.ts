// Helpers shared by the LMS write API routes. Server-only.
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const LMS_TABLES = {
  courses: "lms_courses",
  chapters: "lms_chapters",
  lessons: "lms_lessons",
} as const;

export type LmsTableKey = keyof typeof LMS_TABLES;

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

// Postgres unique-violation (e.g. duplicate slug) → friendly German.
export function dbError(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    return NextResponse.json(
      { error: "Dieser Slug ist innerhalb des übergeordneten Elements bereits vergeben." },
      { status: 409 },
    );
  }
  return NextResponse.json({ error: error.message }, { status: 500 });
}

// Next order_index for a new row: max within the parent scope + 1.
// scope is null for top-level courses (no parent column).
export async function nextOrderIndex(
  admin: SupabaseClient,
  table: string,
  scope: { column: string; value: string } | null,
): Promise<number> {
  let query = admin.from(table).select("order_index").order("order_index", { ascending: false }).limit(1);
  if (scope) query = query.eq(scope.column, scope.value);
  const { data } = await query;
  const top = data?.[0]?.order_index;
  return typeof top === "number" ? top + 1 : 0;
}
