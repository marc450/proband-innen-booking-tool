"use client";

import { useState, useEffect } from "react";
import { Mail, Loader2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ThreadSummary {
  id: string;
  subject: string;
  snippet: string;
  lastDate: string;
  messageCount: number;
  isUnread: boolean;
}

export function EmailHistory({ email }: { email: string }) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!email) { setLoading(false); return; }

    const fetchEmails = async () => {
      try {
        // Search for all emails to/from this address
        const res = await fetch(`/api/gmail/threads?q=${encodeURIComponent(`{from:${email} to:${email}}`)}&maxResults=10`);
        const data = await res.json();
        if (res.ok) {
          setThreads(data.threads || []);
        } else if (data.authUrl) {
          setError("Gmail nicht verbunden");
        } else {
          setError(data.error);
        }
      } catch {
        setError("Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, [email]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
  };

  if (!email) return null;

  return (
    <div className="mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3 hover:text-foreground transition-colors"
      >
        <Mail className="h-4 w-4" />
        E-Mail-Verlauf
        {!loading && <span className="text-xs text-muted-foreground font-normal">({threads.length})</span>}
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Laden...
            </div>
          ) : error ? (
            <p className="text-xs text-muted-foreground py-2">{error}</p>
          ) : threads.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Keine E-Mails mit {email}</p>
          ) : (
            <div className="space-y-1.5">
              {threads.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/dashboard/inbox?thread=${thread.id}`}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${thread.isUnread ? "font-semibold" : ""}`}>
                      {thread.subject || "(kein Betreff)"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{thread.snippet}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">{formatDate(thread.lastDate)}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
