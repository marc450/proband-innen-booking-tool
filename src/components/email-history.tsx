"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Mail,
  Loader2,
  ExternalLink,
  PenSquare,
  X,
  Send,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/app/dashboard/inbox/rich-text-editor";
import { ContactAutocomplete } from "@/app/dashboard/inbox/contact-autocomplete";
import { useSignature } from "@/hooks/use-signature";

// Contact profile email card. Lists past Gmail threads with this contact
// and embeds an inline composer so staff can send an email without
// leaving the profile (HubSpot-style). The component is a self-contained
// Card — render it at the top level of a detail page, not nested inside
// another card's content.

interface ThreadSummary {
  id: string;
  subject: string;
  snippet: string;
  lastDate: string;
  messageCount: number;
  isUnread: boolean;
}

interface ThreadMessage {
  id: string;
  fromName: string;
  fromEmail: string;
  to: string;
  cc: string;
  date: string;
  body: { html: string; text: string };
  isInbound: boolean;
  sentBy?: string | null;
}

export function EmailHistory({
  email,
  displayName,
  canCompose = true,
}: {
  email: string;
  displayName?: string;
  // Nutzer:innen can view past threads but must not send mail from a
  // profile. Default true keeps admin-only call sites unaffected.
  canCompose?: boolean;
}) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline thread expansion: id of the currently open thread, the
  // fetched messages keyed by thread id, and per-thread loading/error so
  // multiple threads can be opened in succession without clobbering each
  // other's state.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [threadCache, setThreadCache] = useState<Record<string, ThreadMessage[]>>({});
  const [threadLoading, setThreadLoading] = useState<Record<string, boolean>>({});
  const [threadError, setThreadError] = useState<Record<string, string>>({});

  // Compose state
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const signature = useSignature();

  const fetchEmails = useCallback(async () => {
    if (!email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/gmail/threads?q=${encodeURIComponent(
          `{from:${email} to:${email}}`
        )}&maxResults=10`
      );
      const data = await res.json();
      if (res.ok) {
        setThreads(data.threads || []);
        setError(null);
      } else if (data.authUrl) {
        setError("Gmail nicht verbunden");
      } else {
        setError(data.error || "Fehler beim Laden");
      }
    } catch {
      setError("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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

  const toggleThread = useCallback(
    async (threadId: string) => {
      if (expandedId === threadId) {
        setExpandedId(null);
        return;
      }
      setExpandedId(threadId);
      if (threadCache[threadId]) return;

      setThreadLoading((prev) => ({ ...prev, [threadId]: true }));
      setThreadError((prev) => {
        if (!(threadId in prev)) return prev;
        const next = { ...prev };
        delete next[threadId];
        return next;
      });
      try {
        const res = await fetch(`/api/gmail/threads?threadId=${threadId}`);
        const data = await res.json();
        if (res.ok && data.thread?.messages) {
          setThreadCache((prev) => ({ ...prev, [threadId]: data.thread.messages }));
        } else {
          setThreadError((prev) => ({
            ...prev,
            [threadId]: data.error || "Fehler beim Laden",
          }));
        }
      } catch {
        setThreadError((prev) => ({ ...prev, [threadId]: "Fehler beim Laden" }));
      } finally {
        setThreadLoading((prev) => ({ ...prev, [threadId]: false }));
      }
    },
    [expandedId, threadCache],
  );

  const openComposer = () => {
    setSubject("");
    // Seed the editor with the user's signature so the sign-off matches
    // every other composer in the admin panel. The <br><br> gives the
    // user space to type above it without fighting with contenteditable.
    setBody(signature?.html ? `<br><br>${signature.html}` : "");
    setCc("");
    setBcc("");
    setShowCc(false);
    setShowBcc(false);
    setSendError(null);
    setComposing(true);
  };

  const cancelComposer = () => {
    setComposing(false);
    setSubject("");
    setBody("");
    setCc("");
    setBcc("");
    setShowCc(false);
    setShowBcc(false);
    setSendError(null);
  };

  const handleSend = async () => {
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject,
          htmlBody: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">${body}</div>`,
          cc: cc || undefined,
          bcc: bcc || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSendError(data.error || "Fehler beim Senden");
        return;
      }
      setComposing(false);
      setSubject("");
      setBody("");
      setCc("");
      setBcc("");
      setShowCc(false);
      setShowBcc(false);
      // Give Gmail a moment to index the new thread before re-fetching.
      setTimeout(fetchEmails, 1200);
    } catch {
      setSendError("Verbindungsfehler");
    } finally {
      setSending(false);
    }
  };

  if (!email) return null;

  const canSend = !!subject.trim() && body.trim().length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" />
            E-Mails
            {!loading && (
              <span className="text-xs font-normal">({threads.length})</span>
            )}
          </CardTitle>
          {canCompose && !composing && (
            <Button
              size="sm"
              onClick={openComposer}
              className="bg-[#0066FF] hover:bg-[#0055DD] h-8"
            >
              <PenSquare className="h-3.5 w-3.5 mr-1.5" />
              Neue E-Mail
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inline composer */}
        {canCompose && composing && (
          <div className="border border-gray-200 rounded-[10px] p-4 space-y-3 bg-gray-50/40">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground min-w-0 truncate">
                An:{" "}
                <span className="text-foreground font-medium">
                  {displayName ? `${displayName} <${email}>` : email}
                </span>
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
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
                <button
                  onClick={cancelComposer}
                  className="text-gray-500 hover:text-gray-700"
                  title="Abbrechen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {showCc && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500 w-10 flex-shrink-0">
                  CC
                </label>
                <ContactAutocomplete
                  value={cc}
                  onChange={setCc}
                  placeholder="Name oder E-Mail..."
                  className="flex-1 border-0 !px-0 focus-visible:ring-0 h-8 text-xs"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCc(false);
                    setCc("");
                  }}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {showBcc && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500 w-10 flex-shrink-0">
                  BCC
                </label>
                <ContactAutocomplete
                  value={bcc}
                  onChange={setBcc}
                  placeholder="Name oder E-Mail..."
                  className="flex-1 border-0 !px-0 focus-visible:ring-0 h-8 text-xs"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowBcc(false);
                    setBcc("");
                  }}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Betreff"
            />
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Deine Nachricht..."
              autoFocus
              className="min-h-[180px]"
            />
            {sendError && (
              <p className="text-xs text-destructive">{sendError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={cancelComposer}>
                Abbrechen
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sending || !canSend}
                className="bg-[#0066FF] hover:bg-[#0055DD]"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                )}
                Senden
              </Button>
            </div>
          </div>
        )}

        {/* Thread history */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Laden...
          </div>
        ) : error ? (
          <p className="text-xs text-muted-foreground py-2">{error}</p>
        ) : threads.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Noch keine E-Mails mit {email}
          </p>
        ) : (
          <div className="space-y-1">
            {threads.map((thread) => {
              const isOpen = expandedId === thread.id;
              const messages = threadCache[thread.id];
              const isLoading = threadLoading[thread.id];
              const errMsg = threadError[thread.id];
              return (
                <div key={thread.id}>
                  <div
                    className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors group ${
                      isOpen ? "bg-gray-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleThread(thread.id)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      aria-expanded={isOpen}
                    >
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform ${
                          isOpen ? "rotate-0" : "-rotate-90"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm truncate ${
                            thread.isUnread ? "font-semibold" : ""
                          }`}
                        >
                          {thread.subject || "(kein Betreff)"}
                        </p>
                        {!isOpen && (
                          <p className="text-xs text-muted-foreground truncate">
                            {thread.snippet}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDate(thread.lastDate)}
                      </span>
                    </button>
                    <Link
                      href={`/dashboard/inbox?thread=${thread.id}`}
                      title="Im Posteingang öffnen"
                      className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  {isOpen && (
                    <div className="mt-2 ml-6 mr-1 mb-3 space-y-2">
                      {isLoading && !messages && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Nachrichten werden geladen...
                        </div>
                      )}
                      {errMsg && (
                        <p className="text-xs text-destructive py-2">{errMsg}</p>
                      )}
                      {messages?.map((msg) => (
                        <div
                          key={msg.id}
                          className="rounded-[10px] border border-gray-100 bg-white shadow-sm"
                        >
                          <div className="px-4 py-2.5 border-b border-gray-50 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="h-6 w-6 rounded-full bg-[#0066FF]/10 text-[#0066FF] flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                                  {(msg.fromName?.[0] || "?").toUpperCase()}
                                </div>
                                <span className="font-semibold text-sm truncate">
                                  {msg.fromName}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  &lt;{msg.fromEmail}&gt;
                                </span>
                                {!msg.isInbound && (
                                  <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                                    Gesendet
                                  </span>
                                )}
                              </div>
                              {msg.to && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 ml-8 truncate">
                                  An: {msg.to}
                                </p>
                              )}
                              {msg.cc && (
                                <p className="text-[11px] text-muted-foreground ml-8 truncate">
                                  CC: {msg.cc}
                                </p>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap pt-1">
                              {formatFullDate(msg.date)}
                            </span>
                          </div>
                          <div className="px-4 py-3">
                            <div
                              className="prose prose-sm max-w-none text-sm [&_img]:max-w-full [&_table]:text-sm [&_a]:text-[#0066FF] [&_a]:underline"
                              dangerouslySetInnerHTML={{
                                __html:
                                  msg.body.html ||
                                  msg.body.text.replace(/\n/g, "<br>"),
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
