"use client";

import { useState } from "react";
import { Search, Loader2, MailOpen, PenSquare, RefreshCw, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/confirm-dialog";

// Left pane of the HubSpot-style inbox. Owns the search input and filter
// tab UI but not the data: the parent (InboxManager) controls the query
// and filter state so it can drive the Gmail fetch.

export type InboxFilter = "all" | "unread" | "answered" | "spam";

export interface ThreadSummary {
  id: string;
  subject: string;
  snippet: string;
  lastDate: string;
  contactName: string;
  contactEmail: string;
  messageCount: number;
  isUnread: boolean;
  lastMessageInbound: boolean;
}

interface Props {
  threads: ThreadSummary[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
  filter: InboxFilter;
  onFilterChange: (f: InboxFilter) => void;
  selectedThreadId: string | null;
  onSelectThread: (id: string) => void;
  onCompose: () => void;
  onRefresh: () => void;
  nextPageToken?: string;
  onLoadMore: () => void;
  // When true, show a synthetic "Neue E-Mail" item at the top of the list
  // that represents the in-progress compose draft in the center column.
  composing: boolean;
  composeSubject: string;
  composeTo: string;
  onSelectDraft: () => void;
  onDeleteThread: (threadId: string) => void;
}

const FILTERS: { key: InboxFilter; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "unread", label: "Ungelesen" },
  { key: "answered", label: "Beantwortet" },
  { key: "spam", label: "Spam" },
];

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const isThisYear = d.getFullYear() === now.getFullYear();
  if (isThisYear) return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
}

export function ThreadListPane({
  threads,
  loading,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  filter,
  onFilterChange,
  selectedThreadId,
  onSelectThread,
  onCompose,
  onRefresh,
  nextPageToken,
  onLoadMore,
  composing,
  composeSubject,
  composeTo,
  onSelectDraft,
  onDeleteThread,
}: Props) {
  const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null);

  return (
    <>
    <ConfirmDialog
      open={!!deleteThreadId}
      onCancel={() => setDeleteThreadId(null)}
      title="Konversation löschen"
      description="Diese Konversation wird in den Papierkorb verschoben."
      confirmLabel="Löschen"
      variant="destructive"
      onConfirm={() => {
        if (deleteThreadId) onDeleteThread(deleteThreadId);
        setDeleteThreadId(null);
      }}
    />
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">Inbox</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600"
              title="Aktualisieren"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onCompose}
              className="h-8 w-8 flex items-center justify-center rounded bg-[#0066FF] hover:bg-[#0055DD] text-white"
              title="Neue E-Mail"
            >
              <PenSquare className="h-4 w-4" />
            </button>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit();
          }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Durchsuchen..."
            className="!pl-9 h-9"
          />
        </form>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-gray-100 px-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`flex-1 text-xs font-medium py-2.5 border-b-2 transition-colors ${
              filter === f.key
                ? "border-[#0066FF] text-[#0066FF]"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {composing && (
          <button
            onClick={onSelectDraft}
            className="w-full text-left px-4 py-3 border-b border-gray-50 bg-[#0066FF]/5 border-l-2 border-l-[#0066FF] transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-sm font-bold text-[#0066FF] truncate">
                {composeTo || "Neue E-Mail"}
              </span>
              <span className="text-[11px] text-[#0066FF] font-medium flex-shrink-0">
                Entwurf
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-900 truncate">
              {composeSubject || "(Betreff)"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              Wird gerade verfasst…
            </p>
          </button>
        )}
        {loading && threads.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <MailOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>Keine E-Mails</p>
          </div>
        ) : (
          <ul>
            {threads.map((t) => {
              const selected = t.id === selectedThreadId;
              return (
                <li key={t.id} className="group relative">
                  <button
                    onClick={() => onSelectThread(t.id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${
                      selected
                        ? "bg-[#0066FF]/5 border-l-2 border-l-[#0066FF]"
                        : t.isUnread
                          ? "bg-blue-50/50 hover:bg-blue-50 border-l-2 border-l-transparent"
                          : "hover:bg-gray-50 border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {t.isUnread && (
                          <span className="w-2 h-2 rounded-full bg-[#0066FF] flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm truncate ${
                            t.isUnread ? "font-bold text-gray-900" : "font-medium text-gray-800"
                          }`}
                        >
                          {t.contactName || t.contactEmail || "Unbekannt"}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {formatDate(t.lastDate)}
                      </span>
                    </div>
                    <p
                      className={`text-xs truncate ${
                        t.isUnread ? "font-semibold text-gray-900" : "text-gray-700"
                      } ${t.isUnread ? "ml-4" : ""}`}
                    >
                      {t.subject || "(kein Betreff)"}
                      {t.messageCount > 1 && (
                        <span className="text-muted-foreground font-normal ml-1">
                          ({t.messageCount})
                        </span>
                      )}
                    </p>
                    <p className={`text-[11px] text-muted-foreground truncate mt-0.5 ${t.isUnread ? "ml-4" : ""}`}>
                      {t.snippet}
                    </p>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteThreadId(t.id);
                    }}
                    className="absolute right-2 top-2 p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {nextPageToken && (
          <div className="p-3 flex justify-center">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="text-xs text-[#0066FF] hover:underline disabled:opacity-50"
            >
              {loading ? "Lädt…" : "Mehr laden"}
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
