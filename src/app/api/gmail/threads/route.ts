import { NextRequest, NextResponse } from "next/server";
import { listThreads, getThread, getHeader, extractEmailAddress, extractName, getBody, getAttachments, isInbound } from "@/lib/gmail";
import { cleanGmailSnippet } from "@/lib/gmail-text";
import { resolveContactNamesByEmail } from "@/lib/inbox-contact-names";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pageToken = searchParams.get("pageToken") || undefined;
  const q = searchParams.get("q") || undefined;
  const threadId = searchParams.get("threadId");
  const maxResults = Number(searchParams.get("maxResults") || "25");

  try {
    // Single thread detail
    if (threadId) {
      const thread = await getThread(threadId);
      const messages = thread.messages
        .map((msg) => ({
          id: msg.id,
          threadId: msg.threadId,
          from: getHeader(msg, "From"),
          fromEmail: extractEmailAddress(getHeader(msg, "From")),
          fromName: extractName(getHeader(msg, "From")) || extractEmailAddress(getHeader(msg, "From")),
          to: getHeader(msg, "To"),
          cc: getHeader(msg, "Cc"),
          replyTo: extractEmailAddress(getHeader(msg, "Reply-To")),
          subject: getHeader(msg, "Subject"),
          date: new Date(Number(msg.internalDate)).toISOString(),
          body: getBody(msg),
          isInbound: isInbound(msg),
          labels: msg.labelIds || [],
          messageId: getHeader(msg, "Message-ID"),
          references: getHeader(msg, "References"),
          sentBy: getHeader(msg, "X-EPHIA-Sent-By") || null,
          attachments: getAttachments(msg),
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return NextResponse.json({ thread: { id: thread.id, messages } });
    }

    // Thread list
    const result = await listThreads({ maxResults, pageToken, q });

    // Fetch summary for each thread (first message subject, last message date, participant)
    const threadSummaries = await Promise.all(
      result.threads.map(async (t) => {
        try {
          const full = await getThread(t.id);
          const firstMsg = full.messages[0];
          const lastMsg = full.messages[full.messages.length - 1];
          const subject = getHeader(firstMsg, "Subject") || "(kein Betreff)";
          const lastFrom = getHeader(lastMsg, "From");
          const lastDate = new Date(Number(lastMsg.internalDate)).toISOString();
          const isUnread = lastMsg.labelIds?.includes("UNREAD") || false;
          // Whether the most recent message was sent by the contact (inbound)
          // or by us (outbound). Used by the "Beantwortet" filter in the
          // inbox UI to hide threads that still need a reply.
          const lastMessageInbound = isInbound(lastMsg);
          const hasAttachments = full.messages.some((m) => getAttachments(m).length > 0);

          // Get the external participant (not customerlove@ephia.de)
          const participants = new Set<string>();
          for (const msg of full.messages) {
            const from = extractEmailAddress(getHeader(msg, "From"));
            const to = getHeader(msg, "To").split(",").map((e) => extractEmailAddress(e.trim()));
            [from, ...to].forEach((e) => {
              if (e && e !== (process.env.GMAIL_USER_EMAIL || "customerlove@ephia.de")) {
                participants.add(e);
              }
            });
          }

          // Get display name of the external contact. We resolve the
          // From-header name first; the DB-name pass below overrides
          // it for emails we recognise so the thread list says
          // "Natascha Beer" instead of "nasti2004@web.de".
          let contactName = "";
          let contactEmail = "";
          for (const msg of full.messages) {
            const fromEmail = extractEmailAddress(getHeader(msg, "From"));
            if (fromEmail !== (process.env.GMAIL_USER_EMAIL || "customerlove@ephia.de")) {
              contactName = extractName(getHeader(msg, "From")) || fromEmail;
              contactEmail = fromEmail;
              break;
            }
          }
          // If all messages are outbound, use the To of the first message
          if (!contactEmail && full.messages.length > 0) {
            const toHeader = getHeader(full.messages[0], "To");
            contactEmail = extractEmailAddress(toHeader);
            contactName = extractName(toHeader) || contactEmail;
          }
          return {
            id: t.id,
            subject,
            snippet: cleanGmailSnippet(t.snippet || ""),
            lastDate,
            lastFrom,
            contactName,
            contactEmail,
            messageCount: full.messages.length,
            isUnread,
            lastMessageInbound,
            hasAttachments,
          };
        } catch {
          return { id: t.id, subject: "", snippet: cleanGmailSnippet(t.snippet || ""), lastDate: "", lastFrom: "", contactName: "", contactEmail: "", messageCount: 0, isUnread: false, lastMessageInbound: true, hasAttachments: false };
        }
      })
    );

    // Overlay DB-known names whenever the DB has a full first+last for
    // this email. The DB is the canonical source of truth for our
    // contacts, so it wins over whatever display name the sender chose
    // in their Gmail account (e.g. "EN Herz" → "Eva Herz"). The lib
    // returns nothing for partial-name rows, so the From-header display
    // name still shows through when the DB only has a first name.
    const emailsToResolve = threadSummaries
      .filter((t) => !!t.contactEmail)
      .map((t) => t.contactEmail);
    if (emailsToResolve.length > 0) {
      const nameMap = await resolveContactNamesByEmail(emailsToResolve);
      for (const t of threadSummaries) {
        if (!t.contactEmail) continue;
        const dbName = nameMap.get(t.contactEmail.trim().toLowerCase());
        if (dbName) t.contactName = dbName;
      }
    }

    return NextResponse.json({
      threads: threadSummaries,
      nextPageToken: result.nextPageToken,
      total: result.resultSizeEstimate,
    });
  } catch (error) {
    console.error("Gmail threads error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not connected")) {
      return NextResponse.json({ error: message, authUrl: "/api/gmail/authorize" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
