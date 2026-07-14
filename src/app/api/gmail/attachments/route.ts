import { NextRequest, NextResponse } from "next/server";
import { downloadAttachment } from "@/lib/gmail";
import { requireVerifiedStaff } from "@/lib/auth-verify";

export async function GET(request: NextRequest) {
  // Verified staff gate — attachments are confidential inbox files.
  if (!(await requireVerifiedStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const messageId = request.nextUrl.searchParams.get("messageId");
  const attachmentId = request.nextUrl.searchParams.get("attachmentId");
  const filename = request.nextUrl.searchParams.get("filename") || "attachment";
  const mimeType = request.nextUrl.searchParams.get("mimeType") || "application/octet-stream";

  if (!messageId || !attachmentId) {
    return NextResponse.json({ error: "messageId and attachmentId required" }, { status: 400 });
  }

  try {
    const result = await downloadAttachment(messageId, attachmentId);

    // Gmail returns base64url-encoded data
    const buffer = Buffer.from(result.data, "base64url");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Attachment download error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed" },
      { status: 500 }
    );
  }
}
