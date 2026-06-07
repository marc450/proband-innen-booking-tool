"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { useSignature } from "@/hooks/use-signature";
import { useDrafts } from "@/hooks/use-drafts";
import { ThreadListPane, type ThreadSummary, type InboxFilter } from "./thread-list-pane";
import { ConversationPane, type ThreadMessage } from "./conversation-pane";
import { ContactSidebar } from "./contact-sidebar";
import { ComposePane } from "./compose-pane";
import { checkSendPayloadSize } from "./send-limits";
import { AlertDialog, ConfirmDialog } from "@/components/confirm-dialog";

// Three-pane HubSpot-style inbox. The parent owns all state: thread list,
// active filter/search, selected thread, and compose modal. Each pane is
// a pure view component that receives props + callbacks.

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
}

interface Assignment {
  assignedTo: string;
  assignedToName: string;
}

// Our own / internal addresses are never real contacts.
function isInternalAddress(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase().endsWith("@ephia.de");
}

// Contact-form mails carry the sender's name in the subject
// ("Kontaktanfrage von Max Mustermann"). Pull it out when present.
function nameFromContactSubject(subject: string | undefined): string | undefined {
  const m = subject?.match(/^\s*Kontaktanfrage von\s+(.+?)\s*$/i);
  return m ? m[1] : undefined;
}

export function InboxManager({
  teamMembers = [],
  currentUserId = "",
}: {
  teamMembers?: TeamMember[];
  currentUserId?: string;
}) {
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
  const drafts = useDrafts();

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
  const [composeError, setComposeError] = useState<string | null>(null);

  // Ref to capture current compose state for saving drafts (avoids stale closures)
  const composeRef = useRef({ composing: false, to: "", subject: "", body: "", cc: "", bcc: "" });
  composeRef.current = { composing, to: composeTo, subject: composeSubject, body: composeBody, cc: composeCc, bcc: composeBcc };

  // Auto-save compose draft on field changes (debounce is inside the hook)
  useEffect(() => {
    if (!composing) return;
    if (!composeTo && !composeSubject && !composeBody) return;
    drafts.saveComposeDraft({ to: composeTo, subject: composeSubject, body: composeBody, cc: composeCc, bcc: composeBcc });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composing, composeTo, composeSubject, composeBody, composeCc, composeBcc]);

  // Thread assignments
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch("/api/gmail/assignments");
      if (res.ok) setAssignments(await res.json());
    } catch { /* ignore */ }
  }, []);

  const handleAssign = useCallback(async (threadId: string, assignedTo: string | null) => {
    // Optimistic update
    if (assignedTo) {
      const member = teamMembers.find((m) => m.id === assignedTo);
      setAssignments((prev) => ({
        ...prev,
        [threadId]: { assignedTo, assignedToName: member?.name || "Unbekannt" },
      }));
    } else {
      setAssignments((prev) => {
        const next = { ...prev };
        delete next[threadId];
        return next;
      });
    }

    const thread = threads.find((t) => t.id === threadId);
    await fetch("/api/gmail/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, assignedTo, threadSubject: thread?.subject, senderEmail: thread?.contactEmail }),
    });
  }, [teamMembers, threads]);

  // Manueller "Als beantwortet markieren" Toggle. Schreibt in
  // inbox_thread_marks via /api/inbox/mark-answered und aktualisiert
  // den lokalen Thread-State optimistisch, damit das Pill sofort
  // erscheint/verschwindet ohne Roundtrip.
  const handleToggleMark = useCallback(async (threadId: string, mark: boolean) => {
    // Optimistic update
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              manuallyAnsweredBy: mark ? signature?.userName || "Markiert" : null,
              manuallyAnsweredAt: mark ? new Date().toISOString() : null,
            }
          : t,
      ),
    );

    try {
      const res = mark
        ? await fetch("/api/inbox/mark-answered", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ threadId }),
          })
        : await fetch(`/api/inbox/mark-answered?threadId=${encodeURIComponent(threadId)}`, {
            method: "DELETE",
          });
      if (!res.ok) throw new Error(await res.text());
      // Server hat den kanonischen Anzeigenamen (aus profiles)
      // zurueckgegeben; auf den optimistischen Wert ueberschreiben.
      if (mark) {
        const data = await res.json();
        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  manuallyAnsweredBy: data.manuallyAnsweredBy ?? t.manuallyAnsweredBy,
                  manuallyAnsweredAt: data.manuallyAnsweredAt ?? t.manuallyAnsweredAt,
                }
              : t,
          ),
        );
      }
    } catch (err) {
      console.error("toggle mark failed:", err);
      // Rollback
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                manuallyAnsweredBy: mark ? null : t.manuallyAnsweredBy,
                manuallyAnsweredAt: mark ? null : t.manuallyAnsweredAt,
              }
            : t,
        ),
      );
    }
  }, [signature]);

  // Translate our filter tabs into a Gmail query. "Beantwortet" is handled
  // client-side since it's a simple !lastMessageInbound check and Gmail has
  // no single query operator for it.
  const buildQuery = useCallback(
    (search: string, f: InboxFilter) => {
      const parts: string[] = [];
      if (search.trim()) parts.push(search.trim());
      // Scope the default and unread tabs to the Inbox label so the
      // archived copies of transactional Resend sends (which live in
      // Sent only after archiveSentMessage) don't leak into this view.
      // Spam keeps its own scope; "Beantwortet" is filtered client-side.
      if (f === "unread") parts.push("is:unread in:inbox");
      else if (f === "spam") parts.push("in:spam");
      else parts.push("in:inbox");
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
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side filter for "Beantwortet": show only threads whose most
  // recent message we sent (i.e. not inbound). All tabs are then sorted
  // by the latest INBOUND message timestamp so a staff reply doesn't
  // bump the thread to the top — only a new customer message does.
  // Threads with no inbound message fall back to lastDate so outbound-
  // only sends still sort by their own timestamp.
  const visibleThreads = useMemo(() => {
    const sortKey = (t: ThreadSummary) =>
      new Date(t.lastInboundDate || t.lastDate).getTime();
    const sortByLatestInbound = (a: ThreadSummary, b: ThreadSummary) =>
      sortKey(b) - sortKey(a);
    let list = threads;
    if (filter === "answered") {
      // Mirror the visual "isAnswered" rule in thread-list-pane: ein
      // Thread ist beantwortet, wenn er einen echten Eingang hat und
      // unsere letzte Nachricht ausgehend ist, oder wenn ein Staff
      // ihn manuell als beantwortet markiert hat (z. B. Telefon-
      // Antwort). Kontaktformular-Benachrichtigungen ohne echten
      // Eingang sind ausgeschlossen.
      list = threads.filter(
        (t) =>
          (!t.lastMessageInbound && !!t.hasInboundMessage) ||
          !!t.manuallyAnsweredBy,
      );
    } else if (filter === "mine") {
      list = threads.filter((t) => assignments[t.id]?.assignedTo === currentUserId);
    }
    return [...list].sort(sortByLatestInbound);
  }, [threads, filter, assignments, currentUserId]);

  const openThread = useCallback(async (threadId: string) => {
    // Compose draft is auto-saved via the useEffect above; just close compose
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

  // Delete (trash) the selected thread. Shows a ConfirmDialog first;
  // on confirm, calls DELETE /api/gmail/threads/[id] (moves to Gmail Trash),
  // optimistically removes it from the list, and closes the center pane.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = useCallback(async () => {
    if (!pendingDeleteId || deleting) return;
    const id = pendingDeleteId;
    setDeleting(true);
    const previous = threads;
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (selectedThread === id) {
      setSelectedThread(null);
      setThreadMessages([]);
    }
    try {
      const res = await fetch(`/api/gmail/threads/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setThreads(previous);
        setDeleteError(data.error || "E-Mail konnte nicht gelöscht werden.");
      } else {
        await drafts.deleteReplyDraft(id).catch(() => {});
      }
    } catch {
      setThreads(previous);
      setDeleteError("Verbindungsfehler beim Löschen.");
    } finally {
      setDeleting(false);
      setPendingDeleteId(null);
    }
  }, [pendingDeleteId, deleting, threads, selectedThread, drafts]);

  // Contact email for sidebar: while composing, follow the recipient input
  // (once it parses as an email). Otherwise derive from the selected thread.
  // Resolve the contact a thread is "about". Contact-form submissions
  // arrive FROM our own address (customerlove@ephia.de) with the real
  // person in the Reply-To header and the name in the subject, so an
  // external Reply-To wins over an internal From.
  const resolvedContact = useMemo<{ email: string | null; name?: string }>(() => {
    if (composing) {
      const trimmed = composeTo.trim();
      return { email: /\S+@\S+\.\S+/.test(trimmed) ? trimmed : null };
    }
    if (!selectedThread) return { email: null };

    const fromMessage = (m: ThreadMessage): { email: string | null; name?: string } =>
      isInternalAddress(m.fromEmail) && m.replyTo && !isInternalAddress(m.replyTo)
        ? { email: m.replyTo, name: nameFromContactSubject(m.subject) }
        : { email: m.fromEmail || null, name: m.fromName || undefined };

    // 1. Latest genuinely inbound (external sender) message.
    const inbound = [...threadMessages].reverse().find((m) => m.isInbound);
    if (inbound) return fromMessage(inbound);
    // 2. Mail sent via our own address but addressed to a real person in
    //    Reply-To — i.e. a contact-form submission.
    const viaReplyTo = [...threadMessages]
      .reverse()
      .find((m) => m.replyTo && !isInternalAddress(m.replyTo));
    if (viaReplyTo) {
      return { email: viaReplyTo.replyTo as string, name: nameFromContactSubject(viaReplyTo.subject) };
    }
    // 3. Outbound-only thread: the contact is the recipient.
    const first = threadMessages[0];
    if (first?.to) return { email: first.to.split(",")[0].trim() || null };
    // 4. Thread summary fallback.
    const t = threads.find((t) => t.id === selectedThread);
    return { email: t?.contactEmail || null, name: t?.contactName };
  }, [composing, composeTo, selectedThread, threadMessages, threads]);

  const contactEmail = resolvedContact.email;
  const contactDisplayName = resolvedContact.name;

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
    setComposeError(null);
    try {
      const attachmentPayloads = await Promise.all(
        composeAttachments.map(async (file) => ({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          content: await fileToBase64(file),
        }))
      );

      const htmlBody = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">${composeBody}</div>`;
      const tooLarge = checkSendPayloadSize(htmlBody, attachmentPayloads);
      if (tooLarge) {
        setComposeError(tooLarge);
        setComposeSending(false);
        return;
      }

      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          htmlBody,
          cc: composeCc || undefined,
          bcc: composeBcc || undefined,
          attachments: attachmentPayloads.length > 0 ? attachmentPayloads : undefined,
          sentBy: signature?.userName || undefined,
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
        await drafts.deleteComposeDraft();
        fetchThreads();
      } else {
        let detail = `Senden fehlgeschlagen (HTTP ${res.status}).`;
        try {
          const data = await res.json();
          if (data?.error) detail = `Senden fehlgeschlagen: ${data.error}`;
        } catch {
          /* response had no JSON body */
        }
        setComposeError(detail);
      }
    } catch (err) {
      setComposeError(
        `Senden fehlgeschlagen: ${err instanceof Error ? err.message : "Netzwerkfehler"}`,
      );
    } finally {
      setComposeSending(false);
    }
  };

  const cancelCompose = async () => {
    setComposing(false);
    setComposeError(null);
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
    setComposeCc("");
    setComposeBcc("");
    setComposeAttachments([]);
    await drafts.deleteComposeDraft();
  };

  // Track a deferred compose-open request that arrived while drafts were
  // still loading. Opening a blank composer during load can cause the user's
  // first keystrokes to overwrite a previously-saved draft once the fetch
  // lands, so we wait for drafts.loading to flip to false.
  const pendingComposeOpenRef = useRef(false);

  const openCompose = useCallback(() => {
    if (drafts.loading) {
      pendingComposeOpenRef.current = true;
      return;
    }
    if (drafts.composeDraft) {
      // Restore saved draft from Supabase
      setComposeTo(drafts.composeDraft.to);
      setComposeSubject(drafts.composeDraft.subject);
      setComposeBody(drafts.composeDraft.body);
      setComposeCc(drafts.composeDraft.cc);
      setComposeBcc(drafts.composeDraft.bcc);
      setComposeAttachments([]);
    } else {
      const sig = signature?.html ? `<br><br>${signature.html}` : "";
      setComposeBody(sig);
      setComposeTo("");
      setComposeSubject("");
      setComposeCc("");
      setComposeBcc("");
      setComposeAttachments([]);
    }
    setComposing(true);
    setSelectedThread(null);
    setThreadMessages([]);
  }, [drafts.loading, drafts.composeDraft, signature]);

  // Pencil button = always start a fresh email. Any existing saved
  // draft is dropped so the user actually gets a blank composer with
  // an empty recipient, regardless of what was previously drafted.
  // The amber "Entwurf" row in the thread list remains the way to
  // resume a saved draft via openCompose.
  const openComposeFresh = useCallback(() => {
    if (drafts.composeDraft) {
      void drafts.deleteComposeDraft();
    }
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
  }, [drafts, signature]);

  // Once drafts finish loading, fulfil any deferred compose-open request.
  useEffect(() => {
    if (drafts.loading) return;
    if (!pendingComposeOpenRef.current) return;
    pendingComposeOpenRef.current = false;
    openCompose();
  }, [drafts.loading, openCompose]);

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
      {drafts.lastError && (
        <div className="bg-amber-50 text-amber-900 text-sm px-4 py-2 flex-shrink-0">
          Entwurf konnte nicht gespeichert werden: {drafts.lastError}
        </div>
      )}
      {/* Below xl (1280px) we drop the contact sidebar and narrow the
          thread list. This is the size hit by Chrome split-screen and
          tablets, where the 3-pane layout would crush the conversation. */}
      <div className="flex-1 grid grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_360px] min-h-0">
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
            onCompose={openComposeFresh}
            onRefresh={handleRefresh}
            nextPageToken={nextPageToken}
            onLoadMore={handleLoadMore}
            assignments={assignments}
            teamMembers={teamMembers}
            composing={composing}
            composeSubject={composing ? composeSubject : drafts.composeDraft?.subject || ""}
            composeTo={composing ? composeTo : drafts.composeDraft?.to || ""}
            hasDraft={composing || !!drafts.composeDraft}
            onSelectDraft={openCompose}
            onDeleteDraft={async () => {
              setComposing(false);
              setComposeTo("");
              setComposeSubject("");
              setComposeBody("");
              setComposeCc("");
              setComposeBcc("");
              setComposeAttachments([]);
              await drafts.deleteComposeDraft();
            }}
            replyDraftThreadIds={Object.keys(drafts.replyDrafts)}
            onDeleteReplyDraft={(threadId) => drafts.deleteReplyDraft(threadId)}
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
              sendError={composeError}
              onCancel={cancelCompose}
              aiContext={{
                to: composeTo,
                subject: composeSubject,
                threadId: null,
                signatureHtml: signature?.html,
                userName: signature?.userName,
              }}
            />
          ) : (
            <ConversationPane
              threadId={selectedThread}
              messages={threadMessages}
              loading={threadLoading}
              signature={signature}
              onSent={handleReplySent}
              assignment={selectedThread ? assignments[selectedThread] || null : null}
              teamMembers={teamMembers}
              onAssign={(assignedTo) => selectedThread && handleAssign(selectedThread, assignedTo)}
              replyDraft={selectedThread ? drafts.replyDrafts[selectedThread] || null : null}
              onReplyDraftChange={(threadId, draft) => {
                // Use the threadId passed by the child (captured at its effect
                // setup time). Do NOT use `selectedThread` here: on rapid
                // thread switches it's already the NEXT thread by the time
                // the child's cleanup fires.
                if (!threadId) return;
                if (draft) drafts.saveReplyDraft(threadId, draft);
                else drafts.deleteReplyDraft(threadId);
              }}
              onDelete={selectedThread ? () => setPendingDeleteId(selectedThread) : undefined}
              autoAnswered={(() => {
                const t = threads.find((x) => x.id === selectedThread);
                return !!t && !t.lastMessageInbound && !!t.hasInboundMessage;
              })()}
              manuallyAnsweredBy={
                threads.find((x) => x.id === selectedThread)?.manuallyAnsweredBy || null
              }
              onMarkAnswered={selectedThread ? () => handleToggleMark(selectedThread, true) : undefined}
              onUnmarkAnswered={selectedThread ? () => handleToggleMark(selectedThread, false) : undefined}
            />
          )}
        </div>
        <div className="hidden xl:block min-h-0 overflow-hidden border-l border-gray-100 bg-white">
          <ContactSidebar email={contactEmail} displayName={contactDisplayName} />
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDeleteId}
        title="E-Mail löschen?"
        description="Die E-Mail wird in den Gmail-Papierkorb verschoben und dort nach 30 Tagen endgültig entfernt."
        confirmLabel={deleting ? "Wird gelöscht..." : "Löschen"}
        variant="destructive"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      <AlertDialog
        open={!!deleteError}
        title="Fehler beim Löschen"
        description={deleteError ?? ""}
        onClose={() => setDeleteError(null)}
      />
    </div>
  );
}
