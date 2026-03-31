"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  RefreshCw,
  Mail,
  Send,
  ChevronLeft,
  Loader2,
  AlertCircle,
  PenSquare,
  MailOpen,
  ArrowLeft,
} from "lucide-react";

interface ThreadSummary {
  id: string;
  subject: string;
  snippet: string;
  lastDate: string;
  contactName: string;
  contactEmail: string;
  messageCount: number;
  isUnread: boolean;
}

interface ThreadMessage {
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

export function InboxManager() {
  const searchParams = useSearchParams();
  const initialThread = searchParams.get("thread");
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [showReply, setShowReply] = useState(false);

  // Compose state
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  const fetchThreads = useCallback(async (query?: string, pageToken?: string) => {
    setLoading(true);
    setError(null);
    setAuthUrl(null);
    try {
      const params = new URLSearchParams();
      params.set("maxResults", "25");
      if (query) params.set("q", query);
      if (pageToken) params.set("pageToken", pageToken);

      const res = await fetch(`/api/gmail/threads?${params}`);
      const data = await res.json();

      if (!res.ok) {
        if (data.authUrl) {
          setAuthUrl(data.authUrl);
          setError("Gmail ist noch nicht verbunden.");
        } else {
          setError(data.error || "Fehler beim Laden der E-Mails");
        }
        return;
      }

      if (pageToken) {
        setThreads((prev) => [...prev, ...data.threads]);
      } else {
        setThreads(data.threads);
      }
      setNextPageToken(data.nextPageToken);
    } catch {
      setError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
    // If URL has ?thread=..., open it directly
    if (initialThread) openThread(initialThread);
  }, [fetchThreads]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
    setNextPageToken(undefined);
    fetchThreads(searchQuery);
  };

  const openThread = async (threadId: string) => {
    setSelectedThread(threadId);
    setThreadLoading(true);
    setShowReply(false);
    try {
      const res = await fetch(`/api/gmail/threads?threadId=${threadId}`);
      const data = await res.json();
      if (res.ok) {
        setThreadMessages(data.thread.messages);
        // Mark as read
        const unreadMsgs = data.thread.messages.filter((m: ThreadMessage) => m.labels.includes("UNREAD"));
        for (const msg of unreadMsgs) {
          fetch("/api/gmail/labels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: msg.id, removeLabels: ["UNREAD"] }),
          }).catch(() => {});
        }
        // Update thread list to mark as read
        setThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, isUnread: false } : t));
      }
    } catch {
      // ignore
    } finally {
      setThreadLoading(false);
    }
  };

  const handleSend = async (isReply = false) => {
    setSending(true);
    try {
      const lastMsg = threadMessages[threadMessages.length - 1];
      const payload: Record<string, string> = {
        to: isReply ? (lastMsg.isInbound ? lastMsg.fromEmail : lastMsg.to.split(",")[0].trim()) : composeTo,
        subject: isReply ? lastMsg.subject : composeSubject,
        htmlBody: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">${composeBody.replace(/\n/g, "<br>")}</div>`,
      };
      if (isReply) {
        payload.threadId = lastMsg.threadId;
        payload.inReplyTo = lastMsg.messageId;
        payload.references = lastMsg.references ? `${lastMsg.references} ${lastMsg.messageId}` : lastMsg.messageId;
      }

      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setComposeBody("");
        if (isReply) {
          setShowReply(false);
          // Reload thread
          openThread(selectedThread!);
        } else {
          setShowCompose(false);
          setComposeTo("");
          setComposeSubject("");
          fetchThreads(activeSearch);
        }
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const isThisYear = d.getFullYear() === now.getFullYear();
    if (isThisYear) return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
    return d.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ── Auth required ──
  if (authUrl) {
    return (
      <div className="p-8 text-center">
        <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Gmail verbinden</h2>
        <p className="text-muted-foreground mb-6">
          Verbinde das customerlove@ephia.de Postfach, um E-Mails in der App zu sehen und zu beantworten.
        </p>
        <a
          href={authUrl}
          className="inline-block bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base py-3 px-6 rounded-[10px] transition-colors"
        >
          Gmail verbinden
        </a>
      </div>
    );
  }

  // ── Compose view ──
  if (showCompose) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCompose(false)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Neue E-Mail</h1>
        </div>
        <div className="bg-white rounded-[10px] p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">An</label>
            <Input value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Betreff</label>
            <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Betreff" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nachricht</label>
            <textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              rows={12}
              className="w-full border border-gray-200 rounded-[10px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#0066FF] resize-y"
              placeholder="Deine Nachricht..."
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => handleSend(false)}
              disabled={sending || !composeTo || !composeSubject || !composeBody}
              className="bg-[#0066FF] hover:bg-[#0055DD]"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Senden
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Thread detail view ──
  if (selectedThread) {
    const threadSubject = threadMessages[0]?.subject || "";
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedThread(null); setThreadMessages([]); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold truncate flex-1">{threadSubject}</h1>
          <span className="text-xs text-muted-foreground">{threadMessages.length} Nachricht{threadMessages.length !== 1 && "en"}</span>
        </div>

        {threadLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {threadMessages.map((msg) => (
              <div key={msg.id} className={`bg-white rounded-[10px] p-5 ${msg.isInbound ? "" : "border-l-4 border-[#0066FF]"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-semibold text-sm">{msg.fromName}</span>
                    <span className="text-xs text-muted-foreground ml-2">&lt;{msg.fromEmail}&gt;</span>
                    {!msg.isInbound && (
                      <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Gesendet</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatFullDate(msg.date)}</span>
                </div>
                {msg.to && (
                  <p className="text-xs text-muted-foreground mb-3">An: {msg.to}</p>
                )}
                <div
                  className="prose prose-sm max-w-none text-sm [&_img]:max-w-full [&_table]:text-sm"
                  dangerouslySetInnerHTML={{ __html: msg.body.html || msg.body.text.replace(/\n/g, "<br>") }}
                />
              </div>
            ))}

            {/* Reply box */}
            {showReply ? (
              <div className="bg-white rounded-[10px] p-5 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Antwort an: {threadMessages[threadMessages.length - 1]?.isInbound
                    ? threadMessages[threadMessages.length - 1]?.fromEmail
                    : threadMessages[threadMessages.length - 1]?.to.split(",")[0].trim()}
                </p>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={6}
                  className="w-full border border-gray-200 rounded-[10px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#0066FF] resize-y"
                  placeholder="Deine Antwort..."
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowReply(false); setComposeBody(""); }}>
                    Abbrechen
                  </Button>
                  <Button
                    onClick={() => handleSend(true)}
                    disabled={sending || !composeBody}
                    className="bg-[#0066FF] hover:bg-[#0055DD]"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Antworten
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => setShowReply(true)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Antworten
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Thread list view ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchThreads(activeSearch)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setShowCompose(true)} className="bg-[#0066FF] hover:bg-[#0055DD]" size="sm">
            <PenSquare className="h-4 w-4 mr-2" />
            Neue E-Mail
          </Button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="E-Mails durchsuchen..."
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">Suchen</Button>
      </form>

      {error && !authUrl && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-[10px]">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && threads.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MailOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Keine E-Mails gefunden</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-[10px] divide-y overflow-hidden">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => openThread(thread.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                  thread.isUnread ? "bg-blue-50/50" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm truncate ${thread.isUnread ? "font-bold" : "font-medium"}`}>
                      {thread.contactName || thread.contactEmail || "Unbekannt"}
                    </span>
                    {thread.messageCount > 1 && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">({thread.messageCount})</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                      {formatDate(thread.lastDate)}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${thread.isUnread ? "font-semibold text-foreground" : "text-foreground"}`}>
                    {thread.subject || "(kein Betreff)"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{thread.snippet}</p>
                </div>
              </button>
            ))}
          </div>

          {nextPageToken && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchThreads(activeSearch, nextPageToken)}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Mehr laden
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
