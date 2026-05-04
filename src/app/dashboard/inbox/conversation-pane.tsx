"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, X, Reply, Paperclip, FileText, Image, File, UserCircle, ChevronDown, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "./rich-text-editor";
import { type PickedTemplate } from "./template-picker";
import { useFileDrop } from "./use-file-drop";
import type { ReplyDraft } from "@/hooks/use-drafts";

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
  sentBy?: string | null;
  attachments?: { filename: string; mimeType: string; size: number; attachmentId: string }[];
}

interface Signature {
  html: string;
  userName: string;
}

interface TeamMember {
  id: string;
  name: string;
  initials: string;
}

interface Assignment {
  assignedTo: string;
  assignedToName: string;
}

export type { ReplyDraft } from "@/hooks/use-drafts";

interface Props {
  threadId: string | null;
  messages: ThreadMessage[];
  loading: boolean;
  signature: Signature | null;
  onSent: () => void;
  assignment?: Assignment | null;
  teamMembers?: TeamMember[];
  onAssign?: (assignedTo: string | null) => void;
  replyDraft?: ReplyDraft | null;
  // threadId is passed explicitly so cleanup closures can't leak content
  // from one thread into another on rapid thread switches.
  onReplyDraftChange?: (threadId: string, draft: ReplyDraft | null) => void;
  onDelete?: () => void;
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
  assignment,
  teamMembers = [],
  onAssign,
  replyDraft,
  onReplyDraftChange,
  onDelete,
}: Props) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyHtml, setReplyHtml] = useState("");
  const [replyCc, setReplyCc] = useState("");
  const [replyBcc, setReplyBcc] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<globalThis.File[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [assignDropdownOpen, setAssignDropdownOpen] = useState(false);
  const assignDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag & drop attachments anywhere on the reply composer.
  const { isDragOver: isReplyDragOver, dragProps: replyDragProps } = useFileDrop(
    (files) => setReplyAttachments((prev) => [...prev, ...files]),
  );

  // Close assign dropdown on outside click
  useEffect(() => {
    if (!assignDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(e.target as Node)) {
        setAssignDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [assignDropdownOpen]);

  // On thread change: restore the saved draft for this thread, or reset the
  // composer if there is none. Deliberately NO cleanup side effect here:
  //
  //  - Persistence is already handled by the auto-save useEffect on every
  //    keystroke (it writes to `drafts.replyDrafts[threadId]` + schedules a
  //    debounced DB flush keyed by threadId).
  //  - The hook's own `pagehide` handler flushes pending replies on tab close.
  //
  // Previously we also tried to save-or-delete the outgoing thread's draft
  // from the cleanup. That caused two bugs:
  //   1. With the original stale-closure callback, typed content from thread
  //      A leaked onto thread B.
  //   2. With `cb(capturedThreadId, null)` on empty state, switching away
  //      from a thread that had never been typed into (because we just
  //      reset its composer on entry) would delete its draft.
  // The cleanest fix is to stop trying to be clever on thread switch.
  useEffect(() => {
    if (replyDraft) {
      setReplyOpen(true);
      setReplyHtml(replyDraft.html);
      setReplyCc(replyDraft.cc);
      setReplyBcc(replyDraft.bcc);
      setShowCc(replyDraft.showCc);
      setShowBcc(replyDraft.showBcc);
    } else {
      setReplyOpen(false);
      setReplyHtml("");
      setReplyCc("");
      setReplyBcc("");
      setShowCc(false);
      setShowBcc(false);
    }
    setReplyAttachments([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Block auto-save briefly after an external draft deletion to prevent re-creation
  const draftDeletedRef = useRef(false);

  // Reset reply composer when draft is deleted externally (e.g. X button in thread list)
  const prevReplyDraft = useRef(replyDraft);
  useEffect(() => {
    if (prevReplyDraft.current && !replyDraft && replyOpen) {
      draftDeletedRef.current = true;
      setReplyOpen(false);
      setReplyHtml("");
      setReplyCc("");
      setReplyBcc("");
      setShowCc(false);
      setShowBcc(false);
      setReplyAttachments([]);
    }
    prevReplyDraft.current = replyDraft;
  }, [replyDraft, replyOpen]);

  // Auto-save reply draft on content changes (debounce is inside the hook)
  useEffect(() => {
    if (!replyOpen || !replyHtml || !threadId) return;
    if (draftDeletedRef.current) {
      draftDeletedRef.current = false;
      return;
    }
    onReplyDraftChange?.(threadId, { html: replyHtml, cc: replyCc, bcc: replyBcc, showCc, showBcc });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyHtml, replyCc, replyBcc, showCc, showBcc]);

  // ⌘+Enter / Ctrl+Enter sends the reply from anywhere in the open reply
  // composer (matches Gmail/Outlook). Listener is only armed while the
  // reply panel is open + fillable, so normal Enter-to-newline in other
  // fields keeps working.
  useEffect(() => {
    if (!replyOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (sending) return;
      if (!replyHtml.trim()) return;
      e.preventDefault();
      void handleSend();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // handleSend closes over lots of state — that's fine, we just want the
    // latest version at trigger time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyOpen, replyHtml, sending]);

  // Messages are sorted newest-first; the most recent is at index 0
  const lastMsg = messages[0];

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

  // Picking a template inside the reply composer: replace the body
  // (preserving the trailing signature) and surface a soft notice
  // when {{Vorname}} couldn't be filled. We deliberately don't touch
  // the subject — replies inherit the thread subject and the send
  // path prepends the "Re:" prefix on its own.
  const handlePickTemplate = (picked: PickedTemplate) => {
    const sig = signature?.html ? `<br>${signature.html}` : "";
    setReplyHtml(picked.bodyHtml + sig);
    if (picked.vornameMissing) {
      setTemplateNotice(
        "Vorname konnte nicht gefunden werden, bitte {{Vorname}} manuell ersetzen.",
      );
    } else {
      setTemplateNotice(null);
    }
  };

  useEffect(() => {
    if (!templateNotice) return;
    const t = setTimeout(() => setTemplateNotice(null), 8000);
    return () => clearTimeout(t);
  }, [templateNotice]);

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
          sentBy: signature?.userName || undefined,
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
        if (threadId) onReplyDraftChange?.(threadId, null);
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
        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {messages.length} Nachricht{messages.length !== 1 && "en"}
          </span>

          {onDelete && (
            <button
              onClick={onDelete}
              className="inline-flex items-center justify-center h-7 w-7 rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="E-Mail löschen"
              aria-label="E-Mail löschen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          {/* Assignment dropdown */}
          {onAssign && (
            <div className="relative" ref={assignDropdownRef}>
              <button
                onClick={() => setAssignDropdownOpen(!assignDropdownOpen)}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                {assignment ? (
                  <>
                    {(() => {
                      const idx = teamMembers.findIndex((m) => m.id === assignment.assignedTo);
                      const colors = [
                        { bg: "bg-blue-100", text: "text-blue-700" },
                        { bg: "bg-emerald-100", text: "text-emerald-700" },
                        { bg: "bg-purple-100", text: "text-purple-700" },
                        { bg: "bg-amber-100", text: "text-amber-700" },
                        { bg: "bg-rose-100", text: "text-rose-700" },
                        { bg: "bg-cyan-100", text: "text-cyan-700" },
                      ];
                      const color = colors[Math.max(0, idx) % colors.length];
                      return (
                        <span className={`w-4 h-4 rounded-full ${color.bg} ${color.text} text-[8px] font-bold flex items-center justify-center`}>
                          {assignment.assignedToName.split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase()}
                        </span>
                      );
                    })()}
                    <span className="text-gray-700">{assignment.assignedToName.split(" ").pop()}</span>
                  </>
                ) : (
                  <>
                    <UserCircle className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-gray-500">Zuweisen</span>
                  </>
                )}
                <ChevronDown className="h-3 w-3 text-gray-400" />
              </button>

              {assignDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px] z-50">
                  {assignment && (
                    <button
                      onClick={() => { onAssign(null); setAssignDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      Zuweisung entfernen
                    </button>
                  )}
                  {teamMembers.map((m, idx) => {
                    const colors = [
                      { bg: "bg-blue-100", text: "text-blue-700" },
                      { bg: "bg-emerald-100", text: "text-emerald-700" },
                      { bg: "bg-purple-100", text: "text-purple-700" },
                      { bg: "bg-amber-100", text: "text-amber-700" },
                      { bg: "bg-rose-100", text: "text-rose-700" },
                      { bg: "bg-cyan-100", text: "text-cyan-700" },
                    ];
                    const color = colors[idx % colors.length];
                    return (
                      <button
                        key={m.id}
                        onClick={() => { onAssign(m.id); setAssignDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                          assignment?.assignedTo === m.id ? "bg-gray-50 font-medium" : "text-gray-700"
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full ${color.bg} ${color.text} text-[10px] font-bold flex items-center justify-center flex-shrink-0`}>
                          {m.initials}
                        </span>
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
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
                className="rounded-[10px] shadow-sm border border-gray-100 bg-white"
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
                          <>
                            <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                              Gesendet
                            </span>
                            {msg.sentBy && (
                              <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                                {msg.sentBy}
                              </span>
                            )}
                          </>
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
                    className="prose prose-sm max-w-none text-sm [&_img]:max-w-full [&_table]:text-sm [&_a]:text-[#0066FF] [&_a]:underline"
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
          <div {...replyDragProps} className="relative p-4 space-y-3">
            {/* Drop overlay — only while dragging files over the reply
                area. pointer-events-none keeps the form editable right
                up until the drop event fires. */}
            {isReplyDragOver && (
              <div
                className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-[#0066FF]/10 backdrop-blur-[1px] rounded"
                aria-hidden="true"
              >
                <div className="flex flex-col items-center gap-2 rounded-[10px] border-2 border-dashed border-[#0066FF] bg-white/90 px-6 py-4 shadow">
                  <Upload className="h-6 w-6 text-[#0066FF]" strokeWidth={2.5} />
                  <p className="text-xs font-semibold text-black">
                    Dateien hier ablegen, um sie anzuhängen
                  </p>
                </div>
              </div>
            )}
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
              aiContext={{
                to: replyTo,
                subject: threadSubject,
                threadId: threadId || null,
                signatureHtml: signature?.html,
                userName: signature?.userName,
              }}
              templateContext={{
                recipientEmail: replyTo ?? "",
                onPick: handlePickTemplate,
              }}
            />

            {templateNotice && (
              <div className="bg-amber-50 border border-amber-100 rounded-md px-3 py-2 text-xs text-amber-800">
                {templateNotice}
              </div>
            )}

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
