"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Send, ChevronDown, UserCircle } from "lucide-react";
import { useSignature } from "@/hooks/use-signature";
import { useDrafts } from "@/hooks/use-drafts";
import { RichTextEditor } from "@/app/dashboard/inbox/rich-text-editor";
import { ContactAutocomplete } from "@/app/dashboard/inbox/contact-autocomplete";
import type { ThreadMessage } from "@/app/dashboard/inbox/conversation-pane";

interface TeamMember { id: string; name: string; initials: string; }
interface Assignment { assignedTo: string; assignedToName: string; }

interface Props {
  threadId: string;
  teamMembers?: TeamMember[];
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

const AVATAR_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
];

export function ConversationMobile({ threadId, teamMembers = [] }: Props) {
  const router = useRouter();
  const signature = useSignature();
  const drafts = useDrafts();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyHtml, setReplyHtml] = useState("");
  const [replyCc, setReplyCc] = useState("");
  const [replyBcc, setReplyBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [expandedMsgs, setExpandedMsgs] = useState<Set<string>>(new Set());

  // Track whether reply draft was explicitly deleted (prevents auto-save from re-creating it)
  const draftDeletedRef = useRef(false);

  // Assignment state
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const assignRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!assignOpen) return;
    const handler = (e: MouseEvent) => {
      if (assignRef.current && !assignRef.current.contains(e.target as Node)) {
        setAssignOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [assignOpen]);

  // Fetch assignment for this thread
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/gmail/assignments");
        if (res.ok) {
          const data = await res.json();
          if (data[threadId]) setAssignment(data[threadId]);
        }
      } catch { /* ignore */ }
    })();
  }, [threadId]);

  const handleAssign = useCallback(async (assignedTo: string | null) => {
    if (assignedTo) {
      const member = teamMembers.find((m) => m.id === assignedTo);
      setAssignment({ assignedTo, assignedToName: member?.name || "Unbekannt" });
    } else {
      setAssignment(null);
    }
    setAssignOpen(false);
    const threadSubject = messages[0]?.subject || "";
    const inbound = messages.find((m) => !m.fromEmail?.includes("ephia.de"));
    const senderEmail = inbound?.fromEmail || messages[0]?.fromEmail || "";
    await fetch("/api/gmail/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, assignedTo, threadSubject, senderEmail }),
    });
  }, [threadId, teamMembers, messages]);

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

  // Restore reply draft on mount (if one exists for this thread)
  useEffect(() => {
    const saved = drafts.replyDrafts[threadId];
    if (saved && saved.html) {
      setReplyHtml(saved.html);
      setReplyCc(saved.cc || "");
      setReplyBcc(saved.bcc || "");
      setShowCc(saved.showCc);
      setShowBcc(saved.showBcc);
      setReplyOpen(true);
    }
    // Only run once drafts are loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, drafts.loading]);

  // Auto-save reply draft on content change (debounced inside the hook)
  useEffect(() => {
    if (!replyOpen || !replyHtml.trim() || draftDeletedRef.current) return;
    drafts.saveReplyDraft(threadId, {
      html: replyHtml,
      cc: replyCc,
      bcc: replyBcc,
      showCc,
      showBcc,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyHtml, replyOpen, replyCc, replyBcc, showCc, showBcc]);

  // Keep refs to latest reply state for the cleanup effect (avoids stale closures)
  const replyHtmlRef = useRef(replyHtml);
  replyHtmlRef.current = replyHtml;
  const replyStateRef = useRef({ cc: replyCc, bcc: replyBcc, showCc, showBcc });
  replyStateRef.current = { cc: replyCc, bcc: replyBcc, showCc, showBcc };

  // Save reply draft on unmount / navigation away
  useEffect(() => {
    return () => {
      if (draftDeletedRef.current) return;
      const html = replyHtmlRef.current;
      if (html && html.trim()) {
        const s = replyStateRef.current;
        drafts.saveReplyDraft(threadId, {
          html,
          cc: s.cc,
          bcc: s.bcc,
          showCc: s.showCc,
          showBcc: s.showBcc,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const lastMsg = messages[messages.length - 1];
  const subject = messages[0]?.subject || "(kein Betreff)";

  const openReply = () => {
    const sig = signature?.html ? `<br><br>${signature.html}` : "";
    setReplyHtml(sig);
    // Auto-populate CC from the last message's CC header (desktop parity)
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

  // ⌘+Enter / Ctrl+Enter sends the reply (iPad/desktop keyboards).
  useEffect(() => {
    if (!replyOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (sending || !replyHtml.trim()) return;
      e.preventDefault();
      void handleSend();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyOpen, replyHtml, sending]);

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
          cc: replyCc || undefined,
          bcc: replyBcc || undefined,
        }),
      });
      if (res.ok) {
        draftDeletedRef.current = true;
        setReplyOpen(false);
        setReplyHtml("");
        setReplyCc("");
        setReplyBcc("");
        setShowCc(false);
        setShowBcc(false);
        await drafts.deleteReplyDraft(threadId);
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

        {/* Assignment dropdown */}
        {teamMembers.length > 0 && (
          <div className="relative flex-shrink-0" ref={assignRef}>
            <button
              onClick={() => setAssignOpen(!assignOpen)}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-gray-200 active:bg-gray-50"
            >
              {assignment ? (
                <>
                  {(() => {
                    const idx = teamMembers.findIndex((m) => m.id === assignment.assignedTo);
                    const color = AVATAR_COLORS[Math.max(0, idx) % AVATAR_COLORS.length];
                    return (
                      <span className={`w-4 h-4 rounded-full ${color.bg} ${color.text} text-[8px] font-bold flex items-center justify-center`}>
                        {assignment.assignedToName.split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase()}
                      </span>
                    );
                  })()}
                  <span className="text-gray-700 max-w-[60px] truncate">{assignment.assignedToName.split(" ").pop()}</span>
                </>
              ) : (
                <>
                  <UserCircle className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-gray-500">Zuweisen</span>
                </>
              )}
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>

            {assignOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px] z-50">
                {assignment && (
                  <button
                    onClick={() => handleAssign(null)}
                    className="w-full text-left px-3 py-2.5 text-xs text-gray-500 active:bg-gray-50"
                  >
                    Zuweisung entfernen
                  </button>
                )}
                {teamMembers.map((m, idx) => {
                  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleAssign(m.id)}
                      className={`w-full text-left px-3 py-2.5 text-sm active:bg-gray-50 flex items-center gap-2 ${
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
                    className={`prose prose-sm max-w-none text-sm [&_img]:max-w-full [&_table]:text-sm [&_a]:text-[#0066FF] [&_a]:underline ${
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
            <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
              <span className="truncate min-w-0">
                An:{" "}
                {lastMsg?.isInbound
                  ? lastMsg.fromEmail
                  : lastMsg?.to.split(",")[0].trim()}
              </span>
              {(!showCc || !showBcc) && (
                <div className="flex gap-2 flex-shrink-0">
                  {!showCc && (
                    <button
                      type="button"
                      onClick={() => setShowCc(true)}
                      className="text-xs text-[#0066FF] font-medium"
                    >
                      CC
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      type="button"
                      onClick={() => setShowBcc(true)}
                      className="text-xs text-[#0066FF] font-medium"
                    >
                      BCC
                    </button>
                  )}
                </div>
              )}
            </div>
            {showCc && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 w-8 flex-shrink-0">CC</label>
                <ContactAutocomplete
                  value={replyCc}
                  onChange={setReplyCc}
                  placeholder="Name oder E-Mail..."
                  className="flex-1 border-0 !px-0 focus-visible:ring-0 h-8 text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCc(false);
                    setReplyCc("");
                  }}
                  className="text-gray-400 active:text-gray-600 flex-shrink-0 text-xs px-1"
                >
                  ✕
                </button>
              </div>
            )}
            {showBcc && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 w-8 flex-shrink-0">BCC</label>
                <ContactAutocomplete
                  value={replyBcc}
                  onChange={setReplyBcc}
                  placeholder="Name oder E-Mail..."
                  className="flex-1 border-0 !px-0 focus-visible:ring-0 h-8 text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowBcc(false);
                    setReplyBcc("");
                  }}
                  className="text-gray-400 active:text-gray-600 flex-shrink-0 text-xs px-1"
                >
                  ✕
                </button>
              </div>
            )}
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
