"use client";

import { useState } from "react";
import Link from "next/link";
import type { LmsLesson } from "@/lib/lms/types";
import { parseAndValidateDoc } from "@/lib/lms/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ExternalLink, Check } from "lucide-react";

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
  const [title, setTitle] = useState(lesson.title);
  const [slug, setSlug] = useState(lesson.slug);
  const [lessonType, setLessonType] = useState<"text" | "video">(lesson.lesson_type);
  const [duration, setDuration] = useState(
    lesson.duration_seconds != null ? String(lesson.duration_seconds) : "",
  );
  const [videoId, setVideoId] = useState(lesson.cf_stream_video_id ?? "");
  const [thumb, setThumb] = useState(lesson.video_thumbnail_url ?? "");
  const [published, setPublished] = useState(lesson.is_published);
  const [bodyText, setBodyText] = useState(JSON.stringify(lesson.body, null, 2));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Live client-side validation mirrors the server's check so the author
  // sees problems before saving. The server validates again on write.
  const validation = parseAndValidateDoc(bodyText);

  const formatJson = () => {
    if (validation.ok) setBodyText(JSON.stringify(validation.doc, null, 2));
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
        video_thumbnail_url: thumb,
        is_published: published,
        body: bodyText,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl">
      <Link
        href="/dashboard/lms"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
      </Link>

      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-xs text-muted-foreground">
            {breadcrumb.courseTitle ?? "?"} · {breadcrumb.chapterTitle ?? "?"}
          </p>
          <h1 className="text-2xl font-bold">{title || "Lektion"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/lms/preview/${lesson.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md border hover:bg-black/5"
          >
            <ExternalLink className="h-4 w-4" /> Vorschau
          </Link>
          <Button onClick={save} disabled={busy || !validation.ok}>
            {saved ? (
              <>
                <Check className="h-4 w-4 mr-1" /> Gespeichert
              </>
            ) : busy ? (
              "Speichern..."
            ) : (
              "Speichern"
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[10px] bg-red-50 text-red-700 text-sm px-4 py-3 whitespace-pre-wrap">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Metadata */}
        <div className="bg-white rounded-[10px] shadow-sm p-4 space-y-4 h-fit">
          <div className="space-y-1.5">
            <Label>Titel</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Typ</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={lessonType}
              onChange={(e) => setLessonType(e.target.value as "text" | "video")}
            >
              <option value="text">Text</option>
              <option value="video">Video</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Dauer (Sekunden)</Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="z. B. 264"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cloudflare Stream Video-ID</Label>
            <Input
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              placeholder="z. B. a1b2c3..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Video-Thumbnail-URL</Label>
            <Input value={thumb} onChange={(e) => setThumb(e.target.value)} placeholder="optional" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Veröffentlicht (für Lernende sichtbar)
          </label>
        </div>

        {/* Body JSON */}
        <div className="bg-white rounded-[10px] shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label>Inhalt (TipTap JSON)</Label>
            <button
              type="button"
              onClick={formatJson}
              disabled={!validation.ok}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Formatieren
            </button>
          </div>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            spellCheck={false}
            className="w-full h-[60vh] font-mono text-xs leading-relaxed rounded-md border border-input bg-transparent p-3 resize-y"
          />
          {validation.ok ? (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Gültiger Inhalt, der vom Reader gerendert werden kann.
            </p>
          ) : (
            <div className="text-xs text-red-600">
              <p className="font-medium mb-1">Ungültiger Inhalt:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {validation.errors.slice(0, 8).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Phase A bearbeitet den Inhalt als JSON. Der visuelle Block-Editor folgt in
            Phase B. Speichern ist nur bei gültigem Inhalt möglich.
          </p>
        </div>
      </div>
    </div>
  );
}
