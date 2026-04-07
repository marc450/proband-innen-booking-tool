"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, X, Reply, Paperclip, FileText, Image, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  attachments?: { filename: string; mimeType: string; size: number; attachmentId: string }[];
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
  const [replyCc, setReplyCc] = useState("");
  const [replyBcc, setReplyBcc] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<globalThis.File[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset composer when switching threads.
  useEffect(() => {
    setReplyOpen(false);
    setReplyHtml("");
    setReplyCc("");
    setReplyBcc("");
    setReplyAttachments([]);
    setShowCc(false);
    setShowBcc(false);
  }, [threadId]);

  const lastMsg = messages[messages.length - 1];

  const openReply = () => {
    const sig = signature?.html ? `<br><br>${signature.html}` : "";
    setReplyHtml(sig);
    // Auto-populate CC from the last message's CC header
    if (lastMsg?.cc) {
      setReplyCc(lastMsg.cc);
      setShowCc(true);
    } else {
      setReplyCc("");
      setShowCc(false);
    }
    setReplyBcc("");
    setShowBcc(false);
    setReplyOpen(true);
  };

  const threadSubject = useMemo(() => messages[0]?.subject || "", [messages]);

  const replyTo = lastMsg?.isInbound
    ? lastMsg.fromEmail
    : lastMsg?.to.split(",")[0].trim();

  const fileToBase64 = (file: globalThis.File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data URL prefix: "data:...;base64,"
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSend = async () => {
    if (!lastMsg) return;
    setSending(true);
    try {
      const to = replyTo;
      const subject = lastMsg.subject.startsWith("Re:")
        ? lastMsg.subject
        : `Re: ${lastMsg.subject}`;

      // Convert files to base64
      const attachmentPayloads = await Promise.all(
        replyAttachments.map(async (file) => ({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          content: await fileToBase64(file),
        }))
      );

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
          cc: replyCc || undefined,
          bcc: replyBcc || undefined,
          attachments: attachmentPayloads.length > 0 ? attachmentPayloads : undefined,
        }),
      });
      if (res.ok) {
        setReplyOpen(false);
        setReplyHtml("");
        setReplyCc("");
        setReplyBcc("");
        setReplyAttachments([]);
        setShowCc(false);
        setShowBcc(false);
        onSent();
      }
    } finally {
      setSending(false);
    }
  };

  if (!threadId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm bg-gray-50/30">
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
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={msg.id}>
              {/* Date separator between messages on different days */}
              {idx > 0 &&
                new Date(msg.date).toDateString() !==
                  new Date(messages[idx - 1].date).toDateString() && (
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {new Date(msg.date).toLocaleDateString("de-DE", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}
              <div
                className={`bg-white rounded-[10px] shadow-sm ${
                  msg.isInbound
                    ? "border border-gray-100"
                    : "border-l-4 border-[#0066FF] border-y border-r border-y-gray-100 border-r-gray-100"
                }`}
              >
                {/* Message header */}
                <div className="px-5 py-3 border-b border-gray-50 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-[#0066FF]/10 text-[#0066FF] flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                        {(msg.fromName?.[0] || "?").toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-sm">{msg.fromName}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">
                          &lt;{msg.fromEmail}&gt;
                        </span>
                        {!msg.isInbound && (
                          <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                            Gesendet
                          </span>
                        )}
                      </div>
                    </div>
                    {msg.to && (
                      <p className="text-[11px] text-muted-foreground mt-1 ml-9 truncate">
                        An: {msg.to}
                      </p>
                    )}
                    {msg.cc && (
                      <p className="text-[11px] text-muted-foreground ml-9 truncate">
                        CC: {msg.cc}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap pt-1">
                    {formatFullDate(msg.date)}
                  </span>
                </div>

                {/* Message body */}
                <div className="px-5 py-4">
                  <div
                    className="prose prose-sm max-w-none text-sm [&_img]:max-w-full [&_table]:text-sm"
                    dangerouslySetInnerHTML={{
                      __html:
                        msg.body.html || msg.body.text.replace(/\n/g, "<br>"),
                    }}
                  />
                </div>

                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="px-5 pb-4 flex flex-wrap gap-2">
                    {msg.attachments.map((att, i) => {
                      const isImg = att.mimeType.startsWith("image/");
                      const isPdf = att.mimeType === "application/pdf";
                      const Icon = isImg ? Image : isPdf ? FileText : File;
                      const sizeKb = Math.round(att.size / 1024);
                      const sizeLabel = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
                      return (
                        <a
                          key={i}
                          href={`/api/gmail/attachments?messageId=${msg.id}&attachmentId=${encodeURIComponent(att.attachmentId)}&filename=${encodeURIComponent(att.filename)}&mimeType=${encodeURIComponent(att.mimeType)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs text-gray-700 transition-colors border border-gray-200"
                        >
                          <Icon className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{att.filename}</span>
                          <span className="text-gray-400 flex-shrink-0">{sizeLabel}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
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
            {/* To + CC/BCC toggle */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex-shrink-0">An: {replyTo}</span>
                {(!showCc || !showBcc) && (
                  <div className="flex gap-2 flex-shrink-0">
                    {!showCc && (
                      <button
                        type="button"
                        onClick={() => setShowCc(true)}
                        className="text-xs text-[#0066FF] hover:underline font-medium"
                      >
                        CC
                      </button>
                    )}
                    {!showBcc && (
                      <button
                        type="button"
                        onClick={() => setShowBcc(true)}
                        className="text-xs text-[#0066FF] hover:underline font-medium"
                      >
                        BCC
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setReplyOpen(false);
                  setReplyHtml("");
                  setReplyCc("");
                  setReplyBcc("");
                  setShowCc(false);
                  setShowBcc(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* CC row */}
            {showCc && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500 w-10 flex-shrink-0">
                  CC
                </label>
                <Input
                  value={replyCc}
                  onChange={(e) => setReplyCc(e.target.value)}
                  placeholder="email@example.com"
                  type="email"
                  className="flex-1 border-0 !px-0 focus-visible:ring-0 h-7 text-xs"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCc(false);
                    setReplyCc("");
                  }}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* BCC row */}
            {showBcc && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500 w-10 flex-shrink-0">
                  BCC
                </label>
                <Input
                  value={replyBcc}
                  onChange={(e) => setReplyBcc(e.target.value)}
                  placeholder="email@example.com"
                  type="email"
                  className="flex-1 border-0 !px-0 focus-visible:ring-0 h-7 text-xs"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowBcc(false);
                    setReplyBcc("");
                  }}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <RichTextEditor
              value={replyHtml}
              onChange={setReplyHtml}
              placeholder="Deine Antwort..."
              autoFocus
            />

            {/* Attachment chips */}
            {replyAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {replyAttachments.map((file, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700"
                  >
                    <Paperclip className="h-3 w-3 text-gray-400" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <span className="text-gray-400">
                      {Math.round(file.size / 1024)} KB
                    </span>
                    <button
                      onClick={() =>
                        setReplyAttachments((prev) =>
                          prev.filter((_, idx) => idx !== i)
                        )
                      }
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setReplyAttachments((prev) => [...prev, ...files]);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Anhang hinzufügen"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              </div>
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
