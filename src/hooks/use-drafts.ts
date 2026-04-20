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
  lastError: string | null;
  saveComposeDraft: (draft: ComposeDraft) => void;
  deleteComposeDraft: () => Promise<void>;
  saveReplyDraft: (threadId: string, draft: ReplyDraft) => void;
  deleteReplyDraft: (threadId: string) => Promise<void>;
}

const DEBOUNCE_MS = 250;
const STORAGE_BUCKET = "draft-images";
// Body size ceiling for keepalive unload saves. Browsers cap keepalive at 64 KB
// per origin, so we skip the beacon path for oversized bodies and rely on the
// last debounced save instead.
const KEEPALIVE_MAX_BYTES = 50 * 1024;

function logDraftError(context: string, err: unknown) {
  // Visible in the console so a failed save is no longer invisible.
  // eslint-disable-next-line no-console
  console.warn(`[drafts] ${context}:`, err);
}

function errorMessage(err: unknown): string {
  if (!err) return "Unbekannter Fehler";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

// Upload base64 inline images to Supabase Storage and replace src with public URLs.
// This prevents draft saves from failing due to Supabase's request size limits.
async function uploadInlineImages(
  html: string,
  supabase: ReturnType<typeof createClient>,
  draftId: string,
  onError: (msg: string) => void,
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

      if (error) {
        logDraftError(`inline image upload (${filePath})`, error);
        onError(errorMessage(error));
        // Strip the image rather than leaving a megabyte of base64 in the row,
        // which would push the draft over PostgREST's body size limit and kill
        // the whole save. A missing image is better than a lost draft.
        result = result.replace(fullMatch, "");
        continue;
      }

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        const attrs = (match[1] || "") + (match[5] || "");
        const newImg = `<img ${attrs}src="${urlData.publicUrl}" />`;
        result = result.replace(fullMatch, newImg);
      } else {
        // No URL resolved. Strip to avoid bloating the row.
        result = result.replace(fullMatch, "");
      }
    } catch (e) {
      logDraftError("inline image processing", e);
      onError(errorMessage(e));
      result = result.replace(fullMatch, "");
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
  } catch (e) {
    logDraftError("cleanup images", e);
  }
}

// Best-effort save during `pagehide` / tab close. Uses keepalive so the
// request survives the unload. Skips oversized bodies because browsers drop
// keepalive above ~64 KB.
function beaconSave(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload);
    if (body.length > KEEPALIVE_MAX_BYTES) return;
    // fetch(..., { keepalive: true }) is supported in all evergreen browsers.
    fetch("/api/inbox/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch((e) => logDraftError("beacon save", e));
  } catch (e) {
    logDraftError("beacon serialize", e);
  }
}

// ── Hook ──

export function useDrafts(): UseDraftsReturn {
  const supabase = createClient();

  const [composeDraft, setComposeDraft] = useState<ComposeDraft | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, ReplyDraft>>({});
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  // Loaded flag — until the initial fetch completes, we must NOT allow saves to
  // fire (they could race against the fetch and overwrite the user's typing).
  const loadedRef = useRef(false);

  // Track existing DB row IDs to decide whether we already know about a row.
  const composeRowId = useRef<string | null>(null);
  const replyRowIds = useRef<Record<string, string>>({});

  // Debounce timers
  const composeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Refs for latest draft data (for flush-on-unmount and pagehide)
  const pendingCompose = useRef<ComposeDraft | null>(null);
  const pendingReplies = useRef<Record<string, ReplyDraft>>({});

  // In-flight flush promises. Serialize flushes per key so we never double-write.
  const composeFlushChain = useRef<Promise<void>>(Promise.resolve());
  const replyFlushChains = useRef<Record<string, Promise<void>>>({});

  const recordError = useCallback((msg: string) => {
    setLastError(msg);
  }, []);

  // ── Fetch all drafts on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("email_drafts")
          .select("id, kind, thread_id, to, subject, body, cc, bcc, show_cc, show_bcc");

        if (error) {
          logDraftError("initial fetch", error);
          recordError(errorMessage(error));
        }

        if (cancelled) {
          loadedRef.current = true;
          setLoading(false);
          return;
        }

        if (data) {
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
        }
      } catch (e) {
        logDraftError("initial fetch (exception)", e);
        recordError(errorMessage(e));
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

  // ── Compose draft flush (atomic upsert via conflict_key) ──
  const flushCompose = useCallback(
    (draft: ComposeDraft) => {
      const run = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const draftDir = composeRowId.current || `compose-${user.id}`;
          const safeBody = await uploadInlineImages(draft.body, supabase, draftDir, recordError);

          const { data, error } = await supabase
            .from("email_drafts")
            .upsert(
              {
                user_id: user.id,
                kind: "compose",
                thread_id: null,
                to: draft.to,
                subject: draft.subject,
                body: safeBody,
                cc: draft.cc,
                bcc: draft.bcc,
                show_cc: false,
                show_bcc: false,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "conflict_key" },
            )
            .select("id")
            .single();

          if (error) {
            logDraftError("compose upsert", error);
            recordError(errorMessage(error));
            return;
          }
          if (data?.id) composeRowId.current = data.id;
          // Clear error once a save succeeds so stale warnings don't linger.
          setLastError((prev) => (prev ? null : prev));
        } catch (e) {
          logDraftError("compose upsert (exception)", e);
          recordError(errorMessage(e));
        }
      };
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
    try { await composeFlushChain.current; } catch { /* already logged */ }
    if (composeRowId.current) {
      const idToClean = composeRowId.current;
      cleanupDraftImages(supabase, idToClean);
      const { error } = await supabase.from("email_drafts").delete().eq("id", idToClean);
      if (error) {
        logDraftError("compose delete", error);
        recordError(errorMessage(error));
      }
      composeRowId.current = null;
    }
    try { localStorage.removeItem("inbox:composeDraft"); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reply draft flush (atomic upsert via conflict_key) ──
  const flushReply = useCallback(
    (threadId: string, draft: ReplyDraft) => {
      const run = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const draftDir = replyRowIds.current[threadId] || `reply-${user.id}-${threadId}`;
          const safeHtml = await uploadInlineImages(draft.html, supabase, draftDir, recordError);

          const { data, error } = await supabase
            .from("email_drafts")
            .upsert(
              {
                user_id: user.id,
                kind: "reply",
                thread_id: threadId,
                to: null,
                subject: null,
                body: safeHtml,
                cc: draft.cc,
                bcc: draft.bcc,
                show_cc: draft.showCc,
                show_bcc: draft.showBcc,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "conflict_key" },
            )
            .select("id")
            .single();

          if (error) {
            logDraftError("reply upsert", error);
            recordError(errorMessage(error));
            return;
          }
          if (data?.id) replyRowIds.current[threadId] = data.id;
          setLastError((prev) => (prev ? null : prev));
        } catch (e) {
          logDraftError("reply upsert (exception)", e);
          recordError(errorMessage(e));
        }
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
    try { await (replyFlushChains.current[threadId] || Promise.resolve()); } catch { /* already logged */ }
    if (replyRowIds.current[threadId]) {
      const idToClean = replyRowIds.current[threadId];
      cleanupDraftImages(supabase, idToClean);
      const { error } = await supabase.from("email_drafts").delete().eq("id", idToClean);
      if (error) {
        logDraftError("reply delete", error);
        recordError(errorMessage(error));
      }
      delete replyRowIds.current[threadId];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Flush pending saves when the page is hidden or unmounts ──
  // pagehide uses keepalive fetch so the final save survives tab close.
  // visibilitychange (hidden) uses the normal Supabase path because the tab
  // may come back to life.
  useEffect(() => {
    const flushAllViaSupabase = () => {
      if (composeTimer.current) {
        clearTimeout(composeTimer.current);
        composeTimer.current = null;
      }
      if (pendingCompose.current) flushCompose(pendingCompose.current);
      for (const [threadId, timer] of Object.entries(replyTimers.current)) {
        clearTimeout(timer);
        if (pendingReplies.current[threadId]) flushReply(threadId, pendingReplies.current[threadId]);
      }
      replyTimers.current = {};
    };

    const flushAllViaBeacon = () => {
      // Don't upload inline images on unload. They may still be data: URLs
      // if typing outran the debounce; the beacon skips saves that are too
      // large anyway, and the normal debounced save should have already
      // persisted the previous state a moment earlier.
      if (composeTimer.current) {
        clearTimeout(composeTimer.current);
        composeTimer.current = null;
      }
      const c = pendingCompose.current;
      if (c) {
        beaconSave({
          kind: "compose",
          to: c.to,
          subject: c.subject,
          body: c.body,
          cc: c.cc,
          bcc: c.bcc,
        });
      }
      for (const [threadId, timer] of Object.entries(replyTimers.current)) {
        clearTimeout(timer);
        const r = pendingReplies.current[threadId];
        if (r) {
          beaconSave({
            kind: "reply",
            threadId,
            body: r.html,
            cc: r.cc,
            bcc: r.bcc,
            showCc: r.showCc,
            showBcc: r.showBcc,
          });
        }
      }
      replyTimers.current = {};
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushAllViaSupabase();
    };
    const onPageHide = () => flushAllViaBeacon();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      // Final flush on React unmount
      flushAllViaSupabase();
    };
  }, [flushCompose, flushReply]);

  // Clean up old localStorage on mount
  useEffect(() => {
    try {
      localStorage.removeItem("inbox:composeDraft");
      localStorage.removeItem("inbox:replyDrafts");
    } catch { /* ignore */ }
  }, []);

  return {
    composeDraft,
    replyDrafts,
    loading,
    lastError,
    saveComposeDraft,
    deleteComposeDraft,
    saveReplyDraft,
    deleteReplyDraft,
  };
}
