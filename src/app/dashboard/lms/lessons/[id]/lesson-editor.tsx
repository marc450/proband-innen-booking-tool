"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import type { LmsLesson, TipTapNode, TipTapDoc } from "@/lib/lms/types";
import { validateTipTapDoc, parseAndValidateDoc } from "@/lib/lms/schema";
import { BlockEditor } from "@/components/lms/editor/block-editor";
import { VideoDropzone } from "@/components/lms/editor/video-dropzone";
import { CfStreamPlayer } from "@/components/lms/cf-stream-player";
import { LessonBody } from "@/lib/lms/renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ExternalLink, Check, Eye, Code2 } from "lucide-react";

type Draft = {
  title: string;
  slug: string;
  lessonType: "text" | "video";
  duration: string;
  videoId: string;
  published: boolean;
  blocks: TipTapNode[];
  ts: number;
};

async function patchLesson(id: string, payload: Record<string, unknown>) {
  const res = await fetch(`/api/admin/lms/lessons/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(json.details) ? `\n• ${json.details.join("\n• ")}` : "";
    throw new Error((json.error || "Speichern fehlgeschlagen.") + detail);
  }
  return json as LmsLesson;
}

export function LessonEditor({
  lesson,
  breadcrumb,
}: {
  lesson: LmsLesson;
  breadcrumb: { courseTitle: string | null; chapterTitle: string | null };
}) {
  // Metadata
  const [title, setTitle] = useState(lesson.title);
  const [slug, setSlug] = useState(lesson.slug);
  const [lessonType, setLessonType] = useState<"text" | "video">(lesson.lesson_type);
  const [duration, setDuration] = useState(lesson.duration_seconds != null ? String(lesson.duration_seconds) : "");
  const [videoId, setVideoId] = useState(lesson.cf_stream_video_id ?? "");
  const [showVideoId, setShowVideoId] = useState(false);
  const [published, setPublished] = useState(lesson.is_published);

  // Content: blocks are the single source of truth.
  const [blocks, setBlocks] = useState<TipTapNode[]>(lesson.body.content ?? []);
  const [tab, setTab] = useState<"visual" | "json">("visual");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string[] | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const doc: TipTapDoc = useMemo(() => ({ type: "doc", content: blocks }), [blocks]);
  const validation = useMemo(() => validateTipTapDoc(doc), [doc]);

  // ── Draft autosave + restore ──────────────────────────────────────
  // Guards against losing work to the inactivity logout, an accidental
  // navigation, or a reload. The current edit state is mirrored to
  // localStorage; if a newer unsaved draft is found on load we offer to
  // restore it. Cleared on a successful server save.
  const draftKey = `lms-draft:${lesson.id}`;
  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        title: lesson.title,
        slug: lesson.slug,
        lessonType: lesson.lesson_type,
        duration: lesson.duration_seconds != null ? String(lesson.duration_seconds) : "",
        videoId: lesson.cf_stream_video_id ?? "",
        published: lesson.is_published,
        blocks: lesson.body.content ?? [],
      }),
    [lesson],
  );
  const [restorable, setRestorable] = useState<Draft | null>(null);

  // On mount: surface a draft only if it differs from the saved lesson.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw) as Draft;
      const snap = JSON.stringify({
        title: d.title, slug: d.slug, lessonType: d.lessonType,
        duration: d.duration, videoId: d.videoId, published: d.published, blocks: d.blocks,
      });
      if (snap !== initialSnapshot) setRestorable(d);
      else localStorage.removeItem(draftKey);
    } catch {
      // ignore a corrupt draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave (debounced). Paused while a restore decision is pending so
  // it can't overwrite the draft the user hasn't acted on yet.
  useEffect(() => {
    if (restorable) return;
    const snap = JSON.stringify({ title, slug, lessonType, duration, videoId, published, blocks });
    if (snap === initialSnapshot) {
      try { localStorage.removeItem(draftKey); } catch {}
      return;
    }
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ title, slug, lessonType, duration, videoId, published, blocks, ts: Date.now() }),
        );
      } catch {
        // storage full / unavailable — ignore
      }
    }, 800);
    return () => clearTimeout(t);
  }, [title, slug, lessonType, duration, videoId, published, blocks, restorable, initialSnapshot, draftKey]);

  const restoreDraft = () => {
    if (!restorable) return;
    setTitle(restorable.title);
    setSlug(restorable.slug);
    setLessonType(restorable.lessonType);
    setDuration(restorable.duration);
    setVideoId(restorable.videoId);
    setPublished(restorable.published);
    setBlocks(restorable.blocks ?? []);
    setRestorable(null);
  };
  const discardDraft = () => {
    try { localStorage.removeItem(draftKey); } catch {}
    setRestorable(null);
  };

  const enterJson = () => {
    setJsonText(JSON.stringify(doc, null, 2));
    setJsonError(null);
    setTab("json");
  };
  const onJsonChange = (text: string) => {
    setJsonText(text);
    const result = parseAndValidateDoc(text);
    if (result.ok) {
      setBlocks(result.doc.content ?? []);
      setJsonError(null);
    } else {
      setJsonError(result.errors);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await patchLesson(lesson.id, {
        title,
        slug,
        lesson_type: lessonType,
        duration_seconds: duration === "" ? null : duration,
        cf_stream_video_id: videoId,
        is_published: published,
        body: doc,
      });
      try { localStorage.removeItem(draftKey); } catch {}
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[1400px]">
      <Link href="/dashboard/lms" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
      </Link>

      <div
        className="sticky top-0 z-30 -mx-8 px-8 py-4 mb-4 flex items-start justify-between gap-4 border-b border-black/5"
        style={{ backgroundColor: "var(--dashboard-bg)" }}
      >
        <div>
          <p className="text-xs text-muted-foreground">{breadcrumb.courseTitle ?? "?"} · {breadcrumb.chapterTitle ?? "?"}</p>
          <h1 className="text-2xl font-bold">{title || "Lektion"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/lms/preview/${lesson.id}`} target="_blank"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md border hover:bg-black/5">
            <ExternalLink className="h-4 w-4" /> Ganzseitige Vorschau
          </Link>
          <Button onClick={save} disabled={busy || !validation.ok}>
            {saved ? <><Check className="h-4 w-4 mr-1" /> Gespeichert</> : busy ? "Speichern…" : "Speichern"}
          </Button>
        </div>
      </div>

      {restorable && (
        <div className="mb-4 rounded-[10px] bg-blue-50 text-blue-900 text-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span>
            Ungespeicherter Entwurf von einer früheren Bearbeitung gefunden. Möchtest Du ihn
            wiederherstellen?
          </span>
          <div className="flex gap-2">
            <Button size="sm" onClick={restoreDraft}>Wiederherstellen</Button>
            <Button size="sm" variant="outline" onClick={discardDraft}>Verwerfen</Button>
          </div>
        </div>
      )}

      {error && <div className="mb-4 rounded-[10px] bg-red-50 text-red-700 text-sm px-4 py-3 whitespace-pre-wrap">{error}</div>}
      {!validation.ok && (
        <div className="mb-4 rounded-[10px] bg-amber-50 text-amber-800 text-sm px-4 py-3">
          <p className="font-medium mb-1">Bitte vervollständigen, bevor Du speicherst:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {validation.errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Metadata bar */}
      <div className="bg-white rounded-[10px] shadow-sm p-4 mb-4 grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="space-y-1.5 col-span-2"><Label>Titel</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-1.5 col-span-2"><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
        <div className="space-y-1.5">
          <Label>Typ</Label>
          <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm" value={lessonType} onChange={(e) => setLessonType(e.target.value as "text" | "video")}>
            <option value="text">Text</option>
            <option value="video">Video</option>
          </select>
        </div>
        <div className="space-y-1.5"><Label>Dauer (Sek.)</Label><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm cursor-pointer self-end pb-2 col-span-2">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Veröffentlicht
        </label>
      </div>

      {/* Video upload (video-type lessons play this clip full-screen) */}
      {lessonType === "video" && (
        <div className="bg-white rounded-[10px] shadow-sm p-4 mb-4">
          <Label>Video</Label>
          <div className="mt-2 max-w-md space-y-2">
            <VideoDropzone value={videoId} onChange={(uid) => setVideoId(uid)} />
            {!showVideoId ? (
              <button type="button" onClick={() => setShowVideoId(true)} className="text-[11px] text-muted-foreground hover:text-foreground">
                oder Cloudflare Video-ID manuell eingeben
              </button>
            ) : (
              <Input value={videoId} onChange={(e) => setVideoId(e.target.value)} placeholder="a1b2c3…" />
            )}
          </div>
        </div>
      )}

      {/* Editor + live preview. Video lessons render only the player to
          learners (the lesson body is never shown), so the Inhalt editor is
          hidden for them and the preview takes the full width. */}
      <div className={`grid grid-cols-1 gap-4 items-start ${lessonType === "video" ? "" : "lg:grid-cols-2"}`}>
        {lessonType !== "video" && (
        <div className="bg-white rounded-[10px] shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <Label>Inhalt</Label>
            <div className="flex items-center gap-1 text-xs">
              <button type="button" onClick={() => setTab("visual")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md ${tab === "visual" ? "bg-[#0066FF] text-white" : "text-muted-foreground hover:bg-black/5"}`}>
                <Eye className="h-3.5 w-3.5" /> Visuell
              </button>
              <button type="button" onClick={enterJson}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md ${tab === "json" ? "bg-[#0066FF] text-white" : "text-muted-foreground hover:bg-black/5"}`}>
                <Code2 className="h-3.5 w-3.5" /> JSON
              </button>
            </div>
          </div>

          {tab === "visual" ? (
            <BlockEditor value={blocks} onChange={setBlocks} />
          ) : (
            <div className="space-y-2">
              <textarea value={jsonText} onChange={(e) => onJsonChange(e.target.value)} spellCheck={false}
                className="w-full h-[60vh] font-mono text-xs leading-relaxed rounded-md border border-input bg-transparent p-3 resize-y" />
              {jsonError ? (
                <div className="text-xs text-red-600">
                  <p className="font-medium mb-1">Ungültig (Änderungen nicht übernommen):</p>
                  <ul className="list-disc pl-4 space-y-0.5">{jsonError.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              ) : (
                <p className="text-xs text-emerald-600 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Gültig.</p>
              )}
            </div>
          )}
        </div>
        )}

        {/* Live preview */}
        <div className={lessonType === "video" ? "max-w-3xl" : "lg:sticky lg:top-4"}>
          <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" /> Live-Vorschau (so sehen es Lernende)
          </div>
          <div className="bg-white rounded-[10px] shadow-sm overflow-hidden">
            <div className="bg-[#FAEBE1] px-6 py-8">
              <h1 className="text-3xl font-bold leading-tight uppercase tracking-tight">{title || "Lektion"}</h1>
            </div>
            {lessonType === "video" ? (
              <div className="bg-black">
                <CfStreamPlayer videoId={videoId || null} />
              </div>
            ) : (
              <div className="py-6 min-h-[200px]">
                {blocks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Vorschau erscheint hier, sobald Du Inhalt hinzufügst.</p>
                ) : (
                  <LessonBody doc={doc} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
