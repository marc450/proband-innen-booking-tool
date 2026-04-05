"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { ThreadListPane, type ThreadSummary, type InboxFilter } from "./thread-list-pane";
import { ConversationPane, type ThreadMessage } from "./conversation-pane";
import { ContactSidebar } from "./contact-sidebar";
import { RichTextEditor } from "./rich-text-editor";

// Three-pane HubSpot-style inbox. The parent owns all state: thread list,
// active filter/search, selected thread, and compose modal. Each pane is
// a pure view component that receives props + callbacks.

export function InboxManager() {
  const searchParams = useSearchParams();
  const initialThread = searchParams.get("thread");

  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();

  const [selectedThread, setSelectedThread] = useState<string | null>(initialThread);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const [signature, setSignature] = useState<{ html: string } | null>(null);

  // Compose modal state
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeSending, setComposeSending] = useState(false);

  // Build signature from the authenticated user's profile row. We keep this
  // client-side rather than adding a new column or API route. Format is the
  // minimal EPHIA sign-off that matches the rest of the app tone.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, title")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled || !profile) return;
        const name = [profile.title, profile.first_name, profile.last_name]
          .filter(Boolean)
          .join(" ");
        const html = `<div style="color:#6b7280;font-size:13px;">Viele Grüße<br>${
          name || "Dein EPHIA Team"
        }<br>EPHIA · customerlove@ephia.de</div>`;
        setSignature({ html });
      } catch {
        // Silently skip — signature is a nice-to-have.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Translate our filter tabs into a Gmail query. "Beantwortet" is handled
  // client-side since it's a simple !lastMessageInbound check and Gmail has
  // no single query operator for it.
  const buildQuery = useCallback(
    (search: string, f: InboxFilter) => {
      const parts: string[] = [];
      if (search.trim()) parts.push(search.trim());
      if (f === "unread") parts.push("is:unread");
      if (f === "spam") parts.push("in:spam");
      return parts.join(" ");
    },
    []
  );

  const fetchThreads = useCallback(
    async (opts?: { pageToken?: string; search?: string; filter?: InboxFilter }) => {
      const s = opts?.search ?? searchQuery;
      const f = opts?.filter ?? filter;
      setLoading(true);
      setError(null);
      setAuthUrl(null);
      try {
        const params = new URLSearchParams();
        params.set("maxResults", "25");
        const q = buildQuery(s, f);
        if (q) params.set("q", q);
        if (opts?.pageToken) params.set("pageToken", opts.pageToken);

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

        if (opts?.pageToken) {
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
    },
    [buildQuery, searchQuery, filter]
  );

  useEffect(() => {
    fetchThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side filter for "Beantwortet": show only threads whose most
  // recent message we sent (i.e. not inbound).
  const visibleThreads = useMemo(() => {
    if (filter === "answered") {
      return threads.filter((t) => !t.lastMessageInbound);
    }
    return threads;
  }, [threads, filter]);

  const openThread = useCallback(async (threadId: string) => {
    setSelectedThread(threadId);
    setThreadLoading(true);
    try {
      const res = await fetch(`/api/gmail/threads?threadId=${threadId}`);
      const data = await res.json();
      if (res.ok) {
        setThreadMessages(data.thread.messages);
        // Mark unread messages as read in the background.
        const unread = data.thread.messages.filter((m: ThreadMessage) =>
          m.labels.includes("UNREAD")
        );
        for (const msg of unread) {
          fetch("/api/gmail/labels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: msg.id, removeLabels: ["UNREAD"] }),
          }).catch(() => {});
        }
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, isUnread: false } : t))
        );
      }
    } finally {
      setThreadLoading(false);
    }
  }, []);

  // Auto-open initial thread from query param on mount.
  useEffect(() => {
    if (initialThread) openThread(initialThread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (f: InboxFilter) => {
    setFilter(f);
    setNextPageToken(undefined);
    fetchThreads({ filter: f });
  };

  const handleSearchSubmit = () => {
    setNextPageToken(undefined);
    fetchThreads({ search: searchQuery });
  };

  const handleRefresh = () => fetchThreads();

  const handleLoadMore = () => {
    if (nextPageToken) fetchThreads({ pageToken: nextPageToken });
  };

  const handleReplySent = () => {
    if (selectedThread) openThread(selectedThread);
    fetchThreads();
  };

  // Contact email for sidebar: derive from the most recent inbound message,
  // fall back to the first message's To, fall back to the thread summary.
  const contactEmail = useMemo(() => {
    if (!selectedThread) return null;
    const inbound = [...threadMessages].reverse().find((m) => m.isInbound);
    if (inbound) return inbound.fromEmail;
    const first = threadMessages[0];
    if (first?.to) return first.to.split(",")[0].trim();
    return threads.find((t) => t.id === selectedThread)?.contactEmail || null;
  }, [selectedThread, threadMessages, threads]);

  const contactDisplayName = useMemo(() => {
    if (!selectedThread) return undefined;
    return threads.find((t) => t.id === selectedThread)?.contactName;
  }, [selectedThread, threads]);

  const handleComposeSend = async () => {
    setComposeSending(true);
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          htmlBody: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">${composeBody}</div>`,
        }),
      });
      if (res.ok) {
        setComposeOpen(false);
        setComposeTo("");
        setComposeSubject("");
        setComposeBody("");
        fetchThreads();
      }
    } finally {
      setComposeSending(false);
    }
  };

  const openCompose = () => {
    const sig = signature?.html ? `<br><br>${signature.html}` : "";
    setComposeBody(sig);
    setComposeOpen(true);
  };

  // ── Gmail auth required ──
  if (authUrl) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Gmail verbinden</h2>
          <p className="text-muted-foreground mb-6">
            Verbinde das customerlove@ephia.de Postfach, um E-Mails in der App
            zu sehen und zu beantworten.
          </p>
          <a
            href={authUrl}
            className="inline-block bg-[#0066FF] hover:bg-[#0055DD] text-white font-bold text-base py-3 px-6 rounded-[10px] transition-colors"
          >
            Gmail verbinden
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-2 flex-shrink-0">
          {error}
        </div>
      )}
      <div className="flex-1 grid grid-cols-[320px_1fr_360px] min-h-0">
        <ThreadListPane
          threads={visibleThreads}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          filter={filter}
          onFilterChange={handleFilterChange}
          selectedThreadId={selectedThread}
          onSelectThread={openThread}
          onCompose={openCompose}
          onRefresh={handleRefresh}
          nextPageToken={nextPageToken}
          onLoadMore={handleLoadMore}
        />
        <ConversationPane
          threadId={selectedThread}
          messages={threadMessages}
          loading={threadLoading}
          signature={signature}
          onSent={handleReplySent}
        />
        <div className="border-l border-gray-100 bg-white overflow-hidden">
          <ContactSidebar email={contactEmail} displayName={contactDisplayName} />
        </div>
      </div>

      {/* Compose modal */}
      {composeOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end justify-end p-6">
          <div className="bg-white rounded-[10px] shadow-2xl w-full max-w-xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold">Neue E-Mail</h3>
              <button
                onClick={() => setComposeOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  An
                </label>
                <Input
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Betreff
                </label>
                <Input
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Betreff"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nachricht
                </label>
                <RichTextEditor value={composeBody} onChange={setComposeBody} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
              <Button variant="outline" onClick={() => setComposeOpen(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={handleComposeSend}
                disabled={
                  composeSending ||
                  !composeTo ||
                  !composeSubject ||
                  !composeBody.trim()
                }
                className="bg-[#0066FF] hover:bg-[#0055DD]"
              >
                {composeSending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Senden
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
