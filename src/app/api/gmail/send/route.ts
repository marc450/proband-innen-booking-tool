import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/gmail";

/**
 * Clean up a comma/semicolon-separated recipient list coming from the
 * autocomplete. The contact picker leaves a trailing ", " after each
 * selection so the user can chain another recipient; we strip that and
 * normalise separators into ", " per RFC 5322.
 */
function cleanRecipientList(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
  return cleaned || undefined;
}

export async function POST(request: NextRequest) {
  try {
    const { to, subject, htmlBody, inReplyTo, references, threadId, cc, bcc, attachments, sentBy } = await request.json();

    if (!to || !subject || !htmlBody) {
      return NextResponse.json({ error: "Missing required fields: to, subject, htmlBody" }, { status: 400 });
    }

    const cleanedTo = cleanRecipientList(to);
    if (!cleanedTo) {
      return NextResponse.json({ error: "Empfänger fehlt." }, { status: 400 });
    }

    const result = await sendEmail(
      cleanedTo,
      subject,
      htmlBody,
      inReplyTo,
      references,
      threadId,
      cleanRecipientList(cc),
      cleanRecipientList(bcc),
      attachments || undefined,
      sentBy || undefined,
    );
    return NextResponse.json({ success: true, messageId: result.id });
  } catch (error) {
    console.error("Gmail send error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to send" }, { status: 500 });
  }
}
