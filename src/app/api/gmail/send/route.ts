import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/gmail";

export async function POST(request: NextRequest) {
  try {
    const { to, subject, htmlBody, inReplyTo, references, threadId, cc, bcc, attachments, sentBy } = await request.json();

    if (!to || !subject || !htmlBody) {
      return NextResponse.json({ error: "Missing required fields: to, subject, htmlBody" }, { status: 400 });
    }

    const result = await sendEmail(to, subject, htmlBody, inReplyTo, references, threadId, cc || undefined, bcc || undefined, attachments || undefined, sentBy || undefined);
    return NextResponse.json({ success: true, messageId: result.id });
  } catch (error) {
    console.error("Gmail send error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send" }, { status: 500 });
  }
}
