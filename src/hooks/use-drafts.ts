"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ──

export interface ComposeDraft {
  to: string;
  subject: string;
  body: string;
  cc: string;
  bcc: string;
}

export interface ReplyDraft {
  html: string;
  cc: string;
  bcc: string;
  showCc: boolean;
  showBcc: boolean;
}

interface DbRow {
  id: string;
  kind: "compose" | "reply";
  thread_id: string | null;
  to: string | null;
  subject: string | null;
  body: string;
  cc: string | null;
  bcc: string | null;
  show_cc: boolean;
  show_bcc: boolean;
}

export interface UseDraftsReturn {
  composeDraft: ComposeDraft | null;
  replyDrafts: Record<string, ReplyDraft>;
  loading: boolean;
  saveComposeDraft: (draft: ComposeDraft) => void;
  deleteComposeDraft: () => Promise<void>;
  saveReplyDraft: (threadId: string, draft: ReplyDraft) => void;
  deleteReplyDraft: (threadId: string) => Promise<void>;
}

const DEBOUNCE_MS = 1500;

// Strip large base64 data URLs from HTML to keep draft size within Supabase limits.
// Pasted screenshots can be 2-3 MB+ as base64, causing silent save failures.
// We replace them with a placeholder so the text content is preserved.
function stripInlineImages(html: string): string {
  return html.replace(
    /<img\s+[^>]*src=["']data:image\/[^"']+["'][^>]*\/?>/gi,
    '<span style="color:#999;font-style:italic">[Bild wird nicht im Entwurf gespeichert]</span>'
  );
}

// ── Hook ──

export function useDrafts(): UseDraftsReturn {
  const supabase = createClient();

  const [composeDraft, setComposeDraft] = useState<ComposeDraft | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, ReplyDraft>>({});
  const [loading, setLoading] = useState(true);

  // Track existing DB row IDs to decide insert vs update
  const composeRowId = useRef<string | null>(null);
  const replyRowIds = useRef<Record<string, string>>({});

  // Debounce timers
  const composeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Refs for latest draft data (for flush-on-unmount)
  const pendingCompose = useRef<ComposeDraft | null>(null);
  const pendingReplies = useRef<Record<string, ReplyDraft>>({});

  // ── Fetch all drafts on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("email_drafts")
          .select("id, kind, thread_id, to, subject, body, cc, bcc, show_cc, show_bcc");

        if (cancelled || !data) { setLoading(false); return; }

        const rows = data as DbRow[];
        for (const row of rows) {
          if (row.kind === "compose") {
            composeRowId.current = row.id;
            setComposeDraft({
              to: row.to || "",
              subject: row.subject || "",
              body: row.body || "",
              cc: row.cc || "",
              bcc: row.bcc || "",
            });
          } else if (row.kind === "reply" && row.thread_id) {
            replyRowIds.current[row.thread_id] = row.id;
            setReplyDrafts((prev) => ({
              ...prev,
              [row.thread_id!]: {
                html: row.body || "",
                cc: row.cc || "",
                bcc: row.bcc || "",
                showCc: row.show_cc,
                showBcc: row.show_bcc,
              },
            }));
          }
        }
      } catch {
        // Non-critical — drafts are a nice-to-have
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Flush pending saves on unmount ──
  useEffect(() => {
    return () => {
      if (composeTimer.current) {
        clearTimeout(composeTimer.current);
        if (pendingCompose.current) {
          flushCompose(pendingCompose.current);
        }
      }
      for (const [threadId, timer] of Object.entries(replyTimers.current)) {
        clearTimeout(timer);
        if (pendingReplies.current[threadId]) {
          flushReply(threadId, pendingReplies.current[threadId]);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Compose draft: persist to Supabase ──
  const flushCompose = async (draft: ComposeDraft) => {
    const safeBody = stripInlineImages(draft.body);
    try {
      if (composeRowId.current) {
        await supabase
          .from("email_drafts")
          .update({
            to: draft.to,
            subject: draft.subject,
            body: safeBody,
            cc: draft.cc,
            bcc: draft.bcc,
            updated_at: new Date().toISOString(),
          })
          .eq("id", composeRowId.current);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("email_drafts")
          .insert({
            user_id: user.id,
            kind: "compose",
            to: draft.to,
            subject: draft.subject,
            body: safeBody,
            cc: draft.cc,
            bcc: draft.bcc,
          })
          .select("id")
          .single();
        if (data) composeRowId.current = data.id;
      }
    } catch { /* non-critical */ }
    pendingCompose.current = null;
  };

  const saveComposeDraft = useCallback((draft: ComposeDraft) => {
    setComposeDraft(draft);
    pendingCompose.current = draft;
    if (composeTimer.current) clearTimeout(composeTimer.current);
    composeTimer.current = setTimeout(() => flushCompose(draft), DEBOUNCE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteComposeDraft = useCallback(async () => {
    if (composeTimer.current) clearTimeout(composeTimer.current);
    pendingCompose.current = null;
    setComposeDraft(null);
    if (composeRowId.current) {
      await supabase.from("email_drafts").delete().eq("id", composeRowId.current);
      composeRowId.current = null;
    }
    // Also clean up localStorage from the old implementation
    try { localStorage.removeItem("inbox:composeDraft"); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reply draft: persist to Supabase ──
  const flushReply = async (threadId: string, draft: ReplyDraft) => {
    const safeHtml = stripInlineImages(draft.html);
    try {
      if (replyRowIds.current[threadId]) {
        await supabase
          .from("email_drafts")
          .update({
            body: safeHtml,
            cc: draft.cc,
            bcc: draft.bcc,
            show_cc: draft.showCc,
            show_bcc: draft.showBcc,
            updated_at: new Date().toISOString(),
          })
          .eq("id", replyRowIds.current[threadId]);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("email_drafts")
          .insert({
            user_id: user.id,
            kind: "reply",
            thread_id: threadId,
            body: safeHtml,
            cc: draft.cc,
            bcc: draft.bcc,
            show_cc: draft.showCc,
            show_bcc: draft.showBcc,
          })
          .select("id")
          .single();
        if (data) replyRowIds.current[threadId] = data.id;
      }
    } catch { /* non-critical */ }
    delete pendingReplies.current[threadId];
  };

  const saveReplyDraft = useCallback((threadId: string, draft: ReplyDraft) => {
    setReplyDrafts((prev) => ({ ...prev, [threadId]: draft }));
    pendingReplies.current[threadId] = draft;
    if (replyTimers.current[threadId]) clearTimeout(replyTimers.current[threadId]);
    replyTimers.current[threadId] = setTimeout(() => flushReply(threadId, draft), DEBOUNCE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteReplyDraft = useCallback(async (threadId: string) => {
    if (replyTimers.current[threadId]) clearTimeout(replyTimers.current[threadId]);
    delete pendingReplies.current[threadId];
    setReplyDrafts((prev) => {
      const next = { ...prev };
      delete next[threadId];
      return next;
    });
    if (replyRowIds.current[threadId]) {
      await supabase.from("email_drafts").delete().eq("id", replyRowIds.current[threadId]);
      delete replyRowIds.current[threadId];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clean up old localStorage on mount
  useEffect(() => {
    try {
      localStorage.removeItem("inbox:composeDraft");
      localStorage.removeItem("inbox:replyDrafts");
    } catch {}
  }, []);

  return {
    composeDraft,
    replyDrafts,
    loading,
    saveComposeDraft,
    deleteComposeDraft,
    saveReplyDraft,
    deleteReplyDraft,
  };
}
