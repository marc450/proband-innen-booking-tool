import { NextRequest, NextResponse } from "next/server";
import { modifyLabels } from "@/lib/gmail";

export async function POST(request: NextRequest) {
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
