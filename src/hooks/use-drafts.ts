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

const DEBOUNCE_MS = 500;
const STORAGE_BUCKET = "draft-images";

// Upload base64 inline images to Supabase Storage and replace src with public URLs.
// This prevents draft saves from failing due to Supabase's request size limits.
async function uploadInlineImages(
  html: string,
  supabase: ReturnType<typeof createClient>,
  draftId: string,
): Promise<string> {
  const imgRegex = /<img\s+([^>]*)src=["'](data:image\/([a-z+]+);base64,([^"']+))["']([^>]*)\/?\s*>/gi;
  const matches = [...html.matchAll(imgRegex)];
  if (matches.length === 0) return html;

  let result = html;
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const fullMatch = match[0];
    const ext = match[3] === "jpeg" ? "jpg" : (match[3] || "png").replace("+xml", "");
    const base64Data = match[4];

    try {
      // Decode base64 to binary
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let j = 0; j < binaryStr.length; j++) bytes[j] = binaryStr.charCodeAt(j);

      const filePath = `${draftId}/${Date.now()}_${i}.${ext}`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, bytes, {
          contentType: `image/${match[3]}`,
          upsert: true,
        });

      if (error) continue; // Keep original if upload fails

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        const attrs = (match[1] || "") + (match[5] || "");
        const newImg = `<img ${attrs}src="${urlData.publicUrl}" />`;
        result = result.replace(fullMatch, newImg);
      }
    } catch {
      // Keep original image tag if anything fails
    }
  }
  return result;
}

// Clean up uploaded draft images from storage
async function cleanupDraftImages(
  supabase: ReturnType<typeof createClient>,
  draftId: string,
) {
  try {
    const { data: files } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(draftId);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${draftId}/${f.name}`);
      await supabase.storage.from(STORAGE_BUCKET).remove(paths);
    }
  } catch { /* non-critical */ }
}

// ── Hook ──

export function useDrafts(): UseDraftsReturn {
  const supabase = createClient();

  const [composeDraft, setComposeDraft] = useState<ComposeDraft | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, ReplyDraft>>({});
  const [loading, setLoading] = useState(true);

  // Loaded flag — until the initial fetch completes, we must NOT allow saves to
  // fire (they could race against the fetch and overwrite the user's typing).
  const loadedRef = useRef(false);

  // Track existing DB row IDs to decide insert vs update
  const composeRowId = useRef<string | null>(null);
  const replyRowIds = useRef<Record<string, string>>({});

  // Debounce timers
  const composeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Refs for latest draft data (for flush-on-unmount and pagehide)
  const pendingCompose = useRef<ComposeDraft | null>(null);
  const pendingReplies = useRef<Record<string, ReplyDraft>>({});

  // In-flight flush promises — serialize flushes per key so we never double-insert
  const composeFlushChain = useRef<Promise<void>>(Promise.resolve());
  const replyFlushChains = useRef<Record<string, Promise<void>>>({});

  // ── Fetch all drafts on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("email_drafts")
          .select("id, kind, thread_id, to, subject, body, cc, bcc, show_cc, show_bcc");

        if (cancelled || !data) {
          loadedRef.current = true;
          setLoading(false);
          return;
        }

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
      loadedRef.current = true;
      setLoading(false);
      // If the user already started typing while loading, flush it now so we
      // don't sit on unsaved state indefinitely.
      if (pendingCompose.current) {
        flushCompose(pendingCompose.current);
      }
      for (const [threadId, draft] of Object.entries(pendingReplies.current)) {
        flushReply(threadId, draft);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Compose draft: persist to Supabase (serialized) ──
  const flushCompose = useCallback(
    (draft: ComposeDraft) => {
      const run = async () => {
        try {
          // Resolve the target row (SELECT-then-INSERT/UPDATE) — we don't rely
          // on a partial unique index for upsert because ON CONFLICT with
          // partial indexes is fragile via PostgREST.
          if (!composeRowId.current) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            // Look up any existing compose row for this user first
            const { data: existing } = await supabase
              .from("email_drafts")
              .select("id")
              .eq("user_id", user.id)
              .eq("kind", "compose")
              .maybeSingle();
            if (existing?.id) {
              composeRowId.current = existing.id;
            } else {
              // Upload images to a user-scoped namespace (no row id yet)
              const safeBodyPre = await uploadInlineImages(draft.body, supabase, `compose-${user.id}`);
              const { data: inserted } = await supabase
                .from("email_drafts")
                .insert({
                  user_id: user.id,
                  kind: "compose",
                  to: draft.to,
                  subject: draft.subject,
                  body: safeBodyPre,
                  cc: draft.cc,
                  bcc: draft.bcc,
                })
                .select("id")
                .single();
              if (inserted?.id) {
                composeRowId.current = inserted.id;
                return; // Insert already persisted the latest draft body
              }
              return; // Insert failed — bail out, try again next flush
            }
          }

          const rowId = composeRowId.current;
          if (!rowId) return;
          const safeBody = await uploadInlineImages(draft.body, supabase, rowId);
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
            .eq("id", rowId);
        } catch { /* non-critical */ }
      };
      // Chain onto any in-flight flush so we never run two at once
      const next = composeFlushChain.current.then(run, run);
      composeFlushChain.current = next;
      return next;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const saveComposeDraft = useCallback(
    (draft: ComposeDraft) => {
      setComposeDraft(draft);
      pendingCompose.current = draft;
      // Never fire saves before the initial fetch has finished — otherwise the
      // fetch result (which may overwrite composeRowId) could clobber the save.
      if (!loadedRef.current) return;
      if (composeTimer.current) clearTimeout(composeTimer.current);
      composeTimer.current = setTimeout(() => {
        composeTimer.current = null;
        if (pendingCompose.current) {
          flushCompose(pendingCompose.current);
        }
      }, DEBOUNCE_MS);
    },
    [flushCompose],
  );

  const deleteComposeDraft = useCallback(async () => {
    if (composeTimer.current) clearTimeout(composeTimer.current);
    pendingCompose.current = null;
    setComposeDraft(null);
    // Wait for any in-flight flush so we don't delete before it has created the row
    try { await composeFlushChain.current; } catch { /* ignore */ }
    if (composeRowId.current) {
      cleanupDraftImages(supabase, composeRowId.current);
      await supabase.from("email_drafts").delete().eq("id", composeRowId.current);
      composeRowId.current = null;
    }
    try { localStorage.removeItem("inbox:composeDraft"); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reply draft: persist to Supabase (serialized) ──
  const flushReply = useCallback(
    (threadId: string, draft: ReplyDraft) => {
      const run = async () => {
        try {
          if (!replyRowIds.current[threadId]) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: existing } = await supabase
              .from("email_drafts")
              .select("id")
              .eq("user_id", user.id)
              .eq("kind", "reply")
              .eq("thread_id", threadId)
              .maybeSingle();
            if (existing?.id) {
              replyRowIds.current[threadId] = existing.id;
            } else {
              const safeHtmlPre = await uploadInlineImages(
                draft.html,
                supabase,
                `reply-${user.id}-${threadId}`,
              );
              const { data: inserted } = await supabase
                .from("email_drafts")
                .insert({
                  user_id: user.id,
                  kind: "reply",
                  thread_id: threadId,
                  body: safeHtmlPre,
                  cc: draft.cc,
                  bcc: draft.bcc,
                  show_cc: draft.showCc,
                  show_bcc: draft.showBcc,
                })
                .select("id")
                .single();
              if (inserted?.id) {
                replyRowIds.current[threadId] = inserted.id;
                return; // Insert already persisted the latest draft body
              }
              return;
            }
          }

          const rowId = replyRowIds.current[threadId];
          const safeHtml = await uploadInlineImages(draft.html, supabase, rowId);
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
            .eq("id", rowId);
        } catch { /* non-critical */ }
      };
      const prev = replyFlushChains.current[threadId] || Promise.resolve();
      const next = prev.then(run, run);
      replyFlushChains.current[threadId] = next;
      return next;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const saveReplyDraft = useCallback(
    (threadId: string, draft: ReplyDraft) => {
      setReplyDrafts((prev) => ({ ...prev, [threadId]: draft }));
      pendingReplies.current[threadId] = draft;
      if (!loadedRef.current) return;
      if (replyTimers.current[threadId]) clearTimeout(replyTimers.current[threadId]);
      replyTimers.current[threadId] = setTimeout(() => {
        delete replyTimers.current[threadId];
        if (pendingReplies.current[threadId]) {
          flushReply(threadId, pendingReplies.current[threadId]);
        }
      }, DEBOUNCE_MS);
    },
    [flushReply],
  );

  const deleteReplyDraft = useCallback(async (threadId: string) => {
    if (replyTimers.current[threadId]) clearTimeout(replyTimers.current[threadId]);
    delete pendingReplies.current[threadId];
    setReplyDrafts((prev) => {
      const next = { ...prev };
      delete next[threadId];
      return next;
    });
    try { await (replyFlushChains.current[threadId] || Promise.resolve()); } catch { /* ignore */ }
    if (replyRowIds.current[threadId]) {
      cleanupDraftImages(supabase, replyRowIds.current[threadId]);
      await supabase.from("email_drafts").delete().eq("id", replyRowIds.current[threadId]);
      delete replyRowIds.current[threadId];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Flush pending saves when the page is hidden or unmounts ──
  // Runs BOTH on React unmount and on browser pagehide / visibilitychange so
  // drafts survive tab-close and hard reloads.
  useEffect(() => {
    const flushAllPending = () => {
      if (composeTimer.current) {
        clearTimeout(composeTimer.current);
        composeTimer.current = null;
      }
      if (pendingCompose.current) {
        flushCompose(pendingCompose.current);
      }
      for (const [threadId, timer] of Object.entries(replyTimers.current)) {
        clearTimeout(timer);
        if (pendingReplies.current[threadId]) {
          flushReply(threadId, pendingReplies.current[threadId]);
        }
      }
      replyTimers.current = {};
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushAllPending();
    };
    const onPageHide = () => flushAllPending();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      // Final flush on React unmount
      flushAllPending();
    };
  }, [flushCompose, flushReply]);

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
