"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { useSignature } from "@/hooks/use-signature";
import { ThreadListPane, type ThreadSummary, type InboxFilter } from "./thread-list-pane";
import { ConversationPane, type ThreadMessage } from "./conversation-pane";
import { ContactSidebar } from "./contact-sidebar";
import { ComposePane } from "./compose-pane";

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

  const signature = useSignature();

  // In-place compose state. When `composing` is true the center column
  // renders <ComposePane/> instead of a thread, and the left column shows
  // a synthetic draft item at the top.
  const [composing, setComposing] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [composeAttachments, setComposeAttachments] = useState<File[]>([]);
  const [composeSending, setComposeSending] = useState(false);

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
    setComposing(false);
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

  // Contact email for sidebar: while composing, follow the recipient input
  // (once it parses as an email). Otherwise derive from the selected thread.
  const contactEmail = useMemo(() => {
    if (composing) {
      const trimmed = composeTo.trim();
      return /\S+@\S+\.\S+/.test(trimmed) ? trimmed : null;
    }
    if (!selectedThread) return null;
    const inbound = [...threadMessages].reverse().find((m) => m.isInbound);
    if (inbound) return inbound.fromEmail;
    const first = threadMessages[0];
    if (first?.to) return first.to.split(",")[0].trim();
    return threads.find((t) => t.id === selectedThread)?.contactEmail || null;
  }, [composing, composeTo, selectedThread, threadMessages, threads]);

  const contactDisplayName = useMemo(() => {
    if (composing) return undefined;
    if (!selectedThread) return undefined;
    return threads.find((t) => t.id === selectedThread)?.contactName;
  }, [composing, selectedThread, threads]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleComposeSend = async () => {
    setComposeSending(true);
    try {
      const attachmentPayloads = await Promise.all(
        composeAttachments.map(async (file) => ({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          content: await fileToBase64(file),
        }))
      );

      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          htmlBody: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">${composeBody}</div>`,
          cc: composeCc || undefined,
          bcc: composeBcc || undefined,
          attachments: attachmentPayloads.length > 0 ? attachmentPayloads : undefined,
        }),
      });
      if (res.ok) {
        setComposing(false);
        setComposeTo("");
        setComposeSubject("");
        setComposeBody("");
        setComposeCc("");
        setComposeBcc("");
        setComposeAttachments([]);
        fetchThreads();
      }
    } finally {
      setComposeSending(false);
    }
  };

  const cancelCompose = () => {
    setComposing(false);
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
    setComposeCc("");
    setComposeBcc("");
    setComposeAttachments([]);
  };

  const openCompose = () => {
    const sig = signature?.html ? `<br><br>${signature.html}` : "";
    setComposeBody(sig);
    setComposeTo("");
    setComposeSubject("");
    setComposeCc("");
    setComposeBcc("");
    setComposeAttachments([]);
    setComposing(true);
    setSelectedThread(null);
    setThreadMessages([]);
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
      <div className="flex-1 grid grid-cols-[320px_minmax(0,1fr)_360px] min-h-0">
        {/* Each grid child needs min-h-0 + overflow-hidden, otherwise the
            grid items default to min-height:auto and the inner
            overflow-y-auto containers can never scroll. */}
        <div className="min-h-0 overflow-hidden">
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
            composing={composing}
            composeSubject={composeSubject}
            composeTo={composeTo}
            onSelectDraft={() => {
              // No-op for now: clicking the draft just keeps the compose
              // pane open. Kept as a prop so we can wire focus-the-editor
              // behaviour later without another API change.
            }}
          />
        </div>
        <div className="min-h-0 overflow-hidden">
          {composing ? (
            <ComposePane
              to={composeTo}
              subject={composeSubject}
              body={composeBody}
              cc={composeCc}
              bcc={composeBcc}
              sending={composeSending}
              onToChange={setComposeTo}
              onSubjectChange={setComposeSubject}
              onBodyChange={setComposeBody}
              onCcChange={setComposeCc}
              onBccChange={setComposeBcc}
              attachments={composeAttachments}
              onAttachmentsChange={setComposeAttachments}
              onSend={handleComposeSend}
              onCancel={cancelCompose}
            />
          ) : (
            <ConversationPane
              threadId={selectedThread}
              messages={threadMessages}
              loading={threadLoading}
              signature={signature}
              onSent={handleReplySent}
            />
          )}
        </div>
        <div className="min-h-0 overflow-hidden border-l border-gray-100 bg-white">
          <ContactSidebar email={contactEmail} displayName={contactDisplayName} />
        </div>
      </div>
    </div>
  );
}
