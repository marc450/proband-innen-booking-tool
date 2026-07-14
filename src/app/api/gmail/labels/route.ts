import { NextRequest, NextResponse } from "next/server";
import { modifyLabels } from "@/lib/gmail";
import { requireVerifiedStaff } from "@/lib/auth-verify";

export async function POST(request: NextRequest) {
  // Verified staff gate — label changes mutate the shared mailbox.
  if (!(await requireVerifiedStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const { messageId, addLabels, removeLabels } = await request.json();

    if (!messageId) {
      return NextResponse.json({ error: "Missing messageId" }, { status: 400 });
    }

    await modifyLabels(messageId, addLabels || [], removeLabels || []);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gmail labels error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update labels" }, { status: 500 });
  }
}
