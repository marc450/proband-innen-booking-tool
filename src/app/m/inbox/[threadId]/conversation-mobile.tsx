"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Send, ChevronDown } from "lucide-react";
import { useSignature } from "@/hooks/use-signature";
import { RichTextEditor } from "@/app/dashboard/inbox/rich-text-editor";
import type { ThreadMessage } from "@/app/dashboard/inbox/conversation-pane";

interface Props {
  threadId: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationMobile({ threadId }: Props) {
  const router = useRouter();
  const signature = useSignature();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyHtml, setReplyHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [expandedMsgs, setExpandedMsgs] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/gmail/threads?threadId=${threadId}`);
        const data = await res.json();
        if (res.ok) {
          setMessages(data.thread.messages);
          // Mark unread as read
          const unread = data.thread.messages.filter((m: ThreadMessage) =>
            m.labels.includes("UNREAD")
          );
          for (const msg of unread) {
            fetch("/api/gmail/labels", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messageId: msg.id,
                removeLabels: ["UNREAD"],
              }),
            }).catch(() => {});
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [threadId]);

  const lastMsg = messages[messages.length - 1];
  const subject = messages[0]?.subject || "(kein Betreff)";

  const openReply = () => {
    const sig = signature?.html ? `<br><br>${signature.html}` : "";
    setReplyHtml(sig);
    setReplyOpen(true);
  };

  const handleSend = async () => {
    if (!lastMsg) return;
    setSending(true);
    try {
      const to = lastMsg.isInbound
        ? lastMsg.fromEmail
        : lastMsg.to.split(",")[0].trim();
      const reSubject = lastMsg.subject.startsWith("Re:")
        ? lastMsg.subject
        : `Re: ${lastMsg.subject}`;
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject: reSubject,
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
        // Refetch thread
        const refreshRes = await fetch(
          `/api/gmail/threads?threadId=${threadId}`
        );
        const refreshData = await refreshRes.json();
        if (refreshRes.ok) setMessages(refreshData.thread.messages);
      }
    } finally {
      setSending(false);
    }
  };

  const toggleExpand = (msgId: string) => {
    setExpandedMsgs((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  return (
    <div className="-mx-4 -mt-4 min-h-dvh bg-[#FAEBE1] flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={() => router.push("/m/inbox")}
          className="p-1 -ml-1 text-[#0066FF]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-black truncate">{subject}</h2>
          <p className="text-xs text-gray-500 truncate">
            {lastMsg?.fromName || lastMsg?.fromEmail || ""}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          messages.map((msg) => {
            const isExpanded = expandedMsgs.has(msg.id);
            return (
              <div
                key={msg.id}
                className={`bg-white rounded-[10px] p-4 ${
                  msg.isInbound ? "" : "border-l-4 border-[#0066FF]"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#0066FF]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-[#0066FF]">
                        {(msg.fromName?.[0] || "?").toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-black truncate block">
                        {msg.fromName || msg.fromEmail}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {formatDate(msg.date)}
                  </span>
                </div>

                {/* Body */}
                <div className="relative">
                  <div
                    className={`prose prose-sm max-w-none text-sm [&_img]:max-w-full [&_table]:text-sm ${
                      !isExpanded ? "max-h-40 overflow-hidden" : ""
                    }`}
                    dangerouslySetInnerHTML={{
                      __html:
                        msg.body.html ||
                        msg.body.text.replace(/\n/g, "<br>"),
                    }}
                  />
                  {!isExpanded && (
                    <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-white to-transparent" />
                  )}
                </div>

                <button
                  onClick={() => toggleExpand(msg.id)}
                  className="flex items-center gap-1 text-xs text-[#0066FF] font-medium mt-2"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                  {isExpanded ? "Weniger" : "Mehr anzeigen"}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Reply bar */}
      <div className="bg-white border-t border-gray-100 flex-shrink-0"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 64px)" }}
      >
        {!replyOpen ? (
          <div className="p-3">
            <button
              onClick={openReply}
              disabled={!lastMsg}
              className="w-full bg-gray-50 text-gray-400 text-sm py-3 rounded-[10px] text-left px-4 active:bg-gray-100"
            >
              Antworten...
            </button>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            <div className="text-xs text-gray-500">
              An:{" "}
              {lastMsg?.isInbound
                ? lastMsg.fromEmail
                : lastMsg?.to.split(",")[0].trim()}
            </div>
            <RichTextEditor
              value={replyHtml}
              onChange={setReplyHtml}
              placeholder="Deine Antwort..."
              autoFocus
              className="max-h-[200px]"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSend}
                disabled={sending || !replyHtml.trim()}
                className="bg-[#0066FF] text-white font-bold text-sm py-2 px-5 rounded-[10px] disabled:opacity-50 flex items-center gap-2 active:bg-[#0055DD]"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Senden
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
