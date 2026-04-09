"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, Pencil, Search, RefreshCw, X } from "lucide-react";
import { useSignature } from "@/hooks/use-signature";
import { useDrafts } from "@/hooks/use-drafts";
import { RichTextEditor } from "@/app/dashboard/inbox/rich-text-editor";
import { Input } from "@/components/ui/input";

type InboxFilter = "all" | "unread" | "answered" | "spam";

interface ThreadSummary {
  id: string;
  subject: string;
  snippet: string;
  date: string;
  contactName: string;
  contactEmail: string;
  isUnread: boolean;
  lastMessageInbound: boolean;
  messageCount: number;
}

const FILTERS: { value: InboxFilter; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "unread", label: "Ungelesen" },
  { value: "answered", label: "Beantwortet" },
  { value: "spam", label: "Spam" },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 1) return `${Math.floor(diff / 60000)} Min`;
  if (hours < 24) return `${Math.floor(hours)} Std`;
  if (hours < 48) return "Gestern";
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

function getInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return (
    (parts[0]?.[0] || "") + (parts[1]?.[0] || "")
  ).toUpperCase() || "?";
}

export function InboxMobile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signature = useSignature();
  const drafts = useDrafts();

  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [refreshing, setRefreshing] = useState(false);

  // Compose overlay state
  const [composing, setComposing] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeSending, setComposeSending] = useState(false);

  const buildQuery = useCallback((search: string, f: InboxFilter) => {
    const parts: string[] = [];
    if (search.trim()) parts.push(search.trim());
    if (f === "unread") parts.push("is:unread");
    if (f === "spam") parts.push("in:spam");
    return parts.join(" ");
  }, []);

  const fetchThreads = useCallback(
    async (opts?: { pageToken?: string; search?: string; filter?: InboxFilter }) => {
      const s = opts?.search ?? searchQuery;
      const f = opts?.filter ?? filter;
      if (!opts?.pageToken) setLoading(true);
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
            setError(data.error || "Fehler beim Laden");
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
        setRefreshing(false);
      }
    },
    [buildQuery, searchQuery, filter]
  );

  useEffect(() => {
    fetchThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle compose=true&to= from search params (e.g. from contact profile)
  useEffect(() => {
    if (searchParams.get("compose") === "true") {
      const to = searchParams.get("to") || "";
      setComposeTo(to);
      setComposeSubject("");
      setComposeBody(signature?.html ? `<br><br>${signature.html}` : "");
      setComposing(true);
    }
  }, [searchParams, signature]);

  // Auto-save compose draft on field changes
  useEffect(() => {
    if (!composing) return;
    if (!composeTo && !composeSubject && !composeBody) return;
    drafts.saveComposeDraft({ to: composeTo, subject: composeSubject, body: composeBody, cc: "", bcc: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composing, composeTo, composeSubject, composeBody]);

  const visibleThreads = useMemo(() => {
    if (filter === "answered") {
      return threads.filter((t) => !t.lastMessageInbound);
    }
    return threads;
  }, [threads, filter]);

  const handleFilterChange = (f: InboxFilter) => {
    setFilter(f);
    setNextPageToken(undefined);
    fetchThreads({ filter: f });
  };

  const handleSearch = () => {
    setNextPageToken(undefined);
    fetchThreads({ search: searchQuery });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchThreads();
  };

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
        setComposing(false);
        setComposeTo("");
        setComposeSubject("");
        setComposeBody("");
        await drafts.deleteComposeDraft();
        fetchThreads();
      }
    } finally {
      setComposeSending(false);
    }
  };

  // Gmail not connected
  if (authUrl) {
    return (
      <div className="text-center py-16">
        <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-2">Gmail verbinden</h2>
        <p className="text-sm text-gray-500 mb-6 px-4">
          Verbinde das customerlove@ephia.de Postfach.
        </p>
        <a
          href={authUrl}
          className="inline-block bg-[#0066FF] text-white font-bold py-3 px-6 rounded-[10px]"
        >
          Gmail verbinden
        </a>
      </div>
    );
  }

  // Compose overlay
  if (composing) {
    return (
      <div className="-mx-4 -mt-4 min-h-dvh bg-white flex flex-col">
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <button
            onClick={async () => {
              setComposing(false);
              setComposeTo("");
              setComposeSubject("");
              setComposeBody("");
              await drafts.deleteComposeDraft();
            }}
            className="text-sm text-[#0066FF] font-medium"
          >
            Abbrechen
          </button>
          <h2 className="text-sm font-bold">Neue E-Mail</h2>
          <button
            onClick={handleComposeSend}
            disabled={composeSending || !composeTo.trim() || !composeSubject.trim()}
            className="text-sm text-[#0066FF] font-bold disabled:opacity-40"
          >
            {composeSending ? "..." : "Senden"}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <label className="text-xs text-gray-500 w-8">An</label>
            <Input
              value={composeTo}
              onChange={(e) => setComposeTo(e.target.value)}
              placeholder="email@example.com"
              type="email"
              className="flex-1 border-0 !px-0 focus-visible:ring-0 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <label className="text-xs text-gray-500 w-8">Betr.</label>
            <Input
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              placeholder="Betreff"
              className="flex-1 border-0 !px-0 focus-visible:ring-0 h-8 text-sm"
            />
          </div>
          <RichTextEditor
            value={composeBody}
            onChange={setComposeBody}
            placeholder="Deine Nachricht..."
            className="min-h-[300px]"
            autoFocus
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-black">Inbox</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-500 active:text-[#0066FF]"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="E-Mails durchsuchen..."
          className="w-full bg-white rounded-[10px] pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0066FF]/30"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 no-scrollbar">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleFilterChange(value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
              filter === value
                ? "bg-[#0066FF] text-white"
                : "bg-white text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && !authUrl && (
        <p className="text-sm text-red-500 text-center py-4">{error}</p>
      )}

      {/* Saved compose draft banner */}
      {!composing && drafts.composeDraft && (
        <div className="bg-amber-50 rounded-[10px] p-3 mb-2 flex items-center justify-between">
          <button
            onClick={() => {
              setComposeTo(drafts.composeDraft!.to);
              setComposeSubject(drafts.composeDraft!.subject);
              setComposeBody(drafts.composeDraft!.body);
              setComposing(true);
            }}
            className="flex-1 min-w-0 text-left"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold text-[#0066FF] truncate">
                {drafts.composeDraft.to || "Neue E-Mail"}
              </span>
              <span className="text-[10px] font-medium text-amber-600 flex-shrink-0">Entwurf</span>
            </div>
            <p className="text-xs text-gray-700 truncate">{drafts.composeDraft.subject || "(Betreff)"}</p>
          </button>
          <button
            onClick={() => drafts.deleteComposeDraft()}
            className="p-1.5 text-gray-400 active:text-gray-700 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Reply draft badges on threads */}
      {/* Thread list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-2">
          {visibleThreads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => router.push(`/m/inbox/${thread.id}`)}
              className="w-full bg-white rounded-[10px] p-4 text-left active:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[#0066FF]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-[#0066FF]">
                    {getInitials(thread.contactName || thread.contactEmail)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm truncate ${
                        thread.isUnread ? "font-bold text-black" : "font-medium text-gray-700"
                      }`}
                    >
                      {thread.contactName || thread.contactEmail}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {drafts.replyDrafts[thread.id] && (
                        <span className="text-[9px] font-medium text-amber-600 bg-amber-50 rounded px-1 py-0.5">
                          Entwurf
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {formatDate(thread.date)}
                      </span>
                    </div>
                  </div>
                  <p
                    className={`text-xs truncate mt-0.5 ${
                      thread.isUnread ? "font-semibold text-black" : "text-gray-600"
                    }`}
                  >
                    {thread.subject || "(kein Betreff)"}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {thread.snippet}
                  </p>
                </div>

                {/* Unread dot */}
                {thread.isUnread && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0066FF] flex-shrink-0 mt-1.5" />
                )}
              </div>
            </button>
          ))}

          {visibleThreads.length === 0 && !loading && (
            <p className="text-center text-sm text-gray-400 py-8">
              Keine E-Mails gefunden.
            </p>
          )}
        </div>
      )}

      {/* Load more */}
      {nextPageToken && (
        <button
          onClick={() => fetchThreads({ pageToken: nextPageToken })}
          className="w-full py-3 text-sm text-[#0066FF] font-medium text-center mt-4"
        >
          Mehr laden
        </button>
      )}

      {/* Compose FAB */}
      <button
        onClick={() => {
          if (drafts.composeDraft) {
            setComposeTo(drafts.composeDraft.to);
            setComposeSubject(drafts.composeDraft.subject);
            setComposeBody(drafts.composeDraft.body);
          } else {
            setComposeTo("");
            setComposeSubject("");
            setComposeBody(signature?.html ? `<br><br>${signature.html}` : "");
          }
          setComposing(true);
        }}
        className="fixed bottom-24 right-5 z-40 w-14 h-14 bg-[#0066FF] text-white rounded-full shadow-lg flex items-center justify-center active:bg-[#0055DD] transition-colors"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <Pencil className="w-5 h-5" />
      </button>
    </div>
  );
}
