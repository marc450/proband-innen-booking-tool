import { NextResponse } from "next/server";
import { trashThread } from "@/lib/gmail";

/**
 * DELETE /api/gmail/threads/[id]
 * Moves the thread to Gmail Trash (reversible within Gmail for 30 days).
 * Does NOT permanently delete the thread.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await trashThread(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Gmail trash error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not connected")) {
      return NextResponse.json({ error: message, authUrl: "/api/gmail/authorize" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
