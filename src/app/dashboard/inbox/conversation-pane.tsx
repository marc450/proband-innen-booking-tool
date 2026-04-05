"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, X, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "./rich-text-editor";

// Middle pane: renders the selected Gmail thread and a reply composer.
// Signature is fetched from the authenticated user's profile row and
// auto-appended to new replies. The composer uses our tiny RichTextEditor
// for basic formatting without pulling in a dependency.

export interface ThreadMessage {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  fromName: string;
  to: string;
  cc: string;
  subject: string;
  date: string;
  body: { html: string; text: string };
  isInbound: boolean;
  labels: string[];
  messageId: string;
  references: string;
}

interface Signature {
  html: string;
}

interface Props {
  threadId: string | null;
  messages: ThreadMessage[];
  loading: boolean;
  signature: Signature | null;
  onSent: () => void;
}

function formatFullDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationPane({
  threadId,
  messages,
  loading,
  signature,
  onSent,
}: Props) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyHtml, setReplyHtml] = useState("");
  const [sending, setSending] = useState(false);

  // Reset composer when switching threads.
  useEffect(() => {
    setReplyOpen(false);
    setReplyHtml("");
  }, [threadId]);

  const lastMsg = messages[messages.length - 1];

  const openReply = () => {
    const sig = signature?.html ? `<br><br>${signature.html}` : "";
    setReplyHtml(sig);
    setReplyOpen(true);
  };

  const threadSubject = useMemo(() => messages[0]?.subject || "", [messages]);

  const handleSend = async () => {
    if (!lastMsg) return;
    setSending(true);
    try {
      const to = lastMsg.isInbound
        ? lastMsg.fromEmail
        : lastMsg.to.split(",")[0].trim();
      const subject = lastMsg.subject.startsWith("Re:")
        ? lastMsg.subject
        : `Re: ${lastMsg.subject}`;
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          htmlBody: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">${replyHtml}</div>`,
          threadId: lastMsg.threadId,
          inReplyTo: lastMsg.messageId,
          references: lastMsg.references
            ? `${lastMsg.references} ${lastMsg.messageId}`
            : lastMsg.messageId,
        }),
      });
      if (res.ok) {
        setReplyOpen(false);
        setReplyHtml("");
        onSent();
      }
    } finally {
      setSending(false);
    }
  };

  if (!threadId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm bg-gray-50/30">
        Wähle eine Konversation aus der Liste.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      {/* Subject header */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-bold truncate">
          {threadSubject || "(kein Betreff)"}
        </h2>
        <span className="text-xs text-muted-foreground ml-4 flex-shrink-0">
          {messages.length} Nachricht{messages.length !== 1 && "en"}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`bg-white rounded-[10px] p-5 ${
                msg.isInbound ? "" : "border-l-4 border-[#0066FF]"
              }`}
            >
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="min-w-0">
                  <span className="font-semibold text-sm">{msg.fromName}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    &lt;{msg.fromEmail}&gt;
                  </span>
                  {!msg.isInbound && (
                    <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                      Gesendet
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatFullDate(msg.date)}
                </span>
              </div>
              {msg.to && (
                <p className="text-xs text-muted-foreground mb-3 truncate">
                  An: {msg.to}
                </p>
              )}
              <div
                className="prose prose-sm max-w-none text-sm [&_img]:max-w-full [&_table]:text-sm"
                dangerouslySetInnerHTML={{
                  __html:
                    msg.body.html || msg.body.text.replace(/\n/g, "<br>"),
                }}
              />
            </div>
          ))
        )}
      </div>

      {/* Reply bar / composer */}
      <div className="border-t border-gray-100 bg-white">
        {!replyOpen ? (
          <div className="p-4 flex justify-center">
            <Button
              onClick={openReply}
              className="bg-[#0066FF] hover:bg-[#0055DD]"
              disabled={!lastMsg}
            >
              <Reply className="h-4 w-4 mr-2" />
              Antworten
            </Button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                An:{" "}
                {lastMsg?.isInbound
                  ? lastMsg.fromEmail
                  : lastMsg?.to.split(",")[0].trim()}
              </span>
              <button
                onClick={() => {
                  setReplyOpen(false);
                  setReplyHtml("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <RichTextEditor
              value={replyHtml}
              onChange={setReplyHtml}
              placeholder="Deine Antwort..."
              autoFocus
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSend}
                disabled={sending || !replyHtml.trim()}
                className="bg-[#0066FF] hover:bg-[#0055DD]"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Senden
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
