"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { LmsCourseTree } from "@/lib/lms/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";

type Kind = "courses" | "chapters" | "lessons";

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Etwas ist schiefgelaufen.");
  return json;
}

export function LmsManager({ initialCatalog }: { initialCatalog: LmsCourseTree[] }) {
  const [catalog, setCatalog] = useState<LmsCourseTree[]>(initialCatalog);
  const [openCourses, setOpenCourses] = useState<Set<string>>(new Set());
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create / rename dialog state.
  const [dialog, setDialog] = useState<
    | null
    | {
        mode: "create" | "edit";
        kind: Kind;
        parentId?: string; // course_id for chapters, chapter_id for lessons
        id?: string; // for edit
        title: string;
        slug: string;
        lessonType: "text" | "video";
      }
  >(null);

  // Delete confirm state.
  const [toDelete, setToDelete] = useState<
    null | { kind: Kind; id: string; label: string }
  >(null);

  const refresh = useCallback(async () => {
    const data = (await api("/api/admin/lms/courses")) as LmsCourseTree[];
    setCatalog(data);
  }, []);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      try {
        await fn();
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  // ── Mutations ────────────────────────────────────────────────────
  const submitDialog = () =>
    run(async () => {
      if (!dialog) return;
      const { mode, kind, parentId, id, title, slug, lessonType } = dialog;
      if (mode === "create") {
        const payload: Record<string, unknown> = { title, slug: slug || undefined };
        if (kind === "chapters") payload.course_id = parentId;
        if (kind === "lessons") {
          payload.chapter_id = parentId;
          payload.lesson_type = lessonType;
        }
        await api(`/api/admin/lms/${kind}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await api(`/api/admin/lms/${kind}/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ title, slug }),
        });
      }
      setDialog(null);
    });

  const togglePublish = (kind: Kind, id: string, next: boolean) =>
    run(async () => {
      await api(`/api/admin/lms/${kind}/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_published: next }),
      });
    });

  const remove = () =>
    run(async () => {
      if (!toDelete) return;
      await api(`/api/admin/lms/${toDelete.kind}/${toDelete.id}`, { method: "DELETE" });
      setToDelete(null);
    });

  const move = (kind: Kind, ids: string[], index: number, dir: -1 | 1) =>
    run(async () => {
      const next = [...ids];
      const target = index + dir;
      if (target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target], next[index]];
      await api("/api/admin/lms/reorder", {
        method: "POST",
        body: JSON.stringify({ kind, ids: next }),
      });
    });

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Lernzentrum</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kurse, Kapitel und Lektionen der eigenen Plattform (study.ephia.de).
            Unabhängig von LearnWorlds.
          </p>
        </div>
        <Button
          onClick={() =>
            setDialog({ mode: "create", kind: "courses", title: "", slug: "", lessonType: "text" })
          }
          disabled={busy}
        >
          <Plus className="h-4 w-4 mr-1" /> Neuer Kurs
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-[10px] bg-red-50 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {catalog.length === 0 && (
          <p className="text-sm text-muted-foreground">Noch keine Kurse angelegt.</p>
        )}

        {catalog.map((course, ci) => {
          const courseIds = catalog.map((c) => c.id);
          const isOpen = openCourses.has(course.id);
          return (
            <div key={course.id} className="bg-white rounded-[10px] shadow-sm">
              {/* Course row */}
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggle(openCourses, setOpenCourses, course.id)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Aufklappen"
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{course.title}</span>
                    <PublishBadge published={course.is_published} />
                    <Badge variant="outline" className="text-[10px]">
                      {course.access_type === "free" ? "frei" : "enrolled"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">/{course.slug}</span>
                </div>
                <RowActions
                  busy={busy}
                  published={course.is_published}
                  onPublish={() => togglePublish("courses", course.id, !course.is_published)}
                  onEdit={() =>
                    setDialog({
                      mode: "edit",
                      kind: "courses",
                      id: course.id,
                      title: course.title,
                      slug: course.slug,
                      lessonType: "text",
                    })
                  }
                  onUp={() => move("courses", courseIds, ci, -1)}
                  onDown={() => move("courses", courseIds, ci, 1)}
                  onDelete={() =>
                    setToDelete({ kind: "courses", id: course.id, label: course.title })
                  }
                />
              </div>

              {/* Chapters */}
              {isOpen && (
                <div className="border-t px-4 py-3 space-y-2">
                  {course.chapters.map((chapter, chi) => {
                    const chapterIds = course.chapters.map((c) => c.id);
                    const chOpen = openChapters.has(chapter.id);
                    return (
                      <div key={chapter.id} className="rounded-[8px] bg-gray-50">
                        <div className="flex items-center gap-2 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggle(openChapters, setOpenChapters, chapter.id)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Aufklappen"
                          >
                            {chOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{chapter.title}</span>
                              <PublishBadge published={chapter.is_published} />
                            </div>
                          </div>
                          <RowActions
                            busy={busy}
                            published={chapter.is_published}
                            onPublish={() => togglePublish("chapters", chapter.id, !chapter.is_published)}
                            onEdit={() =>
                              setDialog({
                                mode: "edit",
                                kind: "chapters",
                                id: chapter.id,
                                title: chapter.title,
                                slug: chapter.slug,
                                lessonType: "text",
                              })
                            }
                            onUp={() => move("chapters", chapterIds, chi, -1)}
                            onDown={() => move("chapters", chapterIds, chi, 1)}
                            onDelete={() =>
                              setToDelete({ kind: "chapters", id: chapter.id, label: chapter.title })
                            }
                          />
                        </div>

                        {/* Lessons */}
                        {chOpen && (
                          <div className="px-3 pb-3 space-y-1.5">
                            {chapter.lessons.map((lesson, li) => {
                              const lessonIds = chapter.lessons.map((l) => l.id);
                              return (
                                <div
                                  key={lesson.id}
                                  className="flex items-center gap-2 bg-white rounded-[8px] px-3 py-2"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <Link
                                        href={`/dashboard/lms/lessons/${lesson.id}`}
                                        className="text-sm truncate hover:underline"
                                      >
                                        {lesson.title}
                                      </Link>
                                      <Badge variant="outline" className="text-[10px]">
                                        {lesson.lesson_type === "video" ? "Video" : "Text"}
                                      </Badge>
                                      <PublishBadge published={lesson.is_published} />
                                    </div>
                                  </div>
                                  <RowActions
                                    busy={busy}
                                    published={lesson.is_published}
                                    onPublish={() =>
                                      togglePublish("lessons", lesson.id, !lesson.is_published)
                                    }
                                    editHref={`/dashboard/lms/lessons/${lesson.id}`}
                                    onUp={() => move("lessons", lessonIds, li, -1)}
                                    onDown={() => move("lessons", lessonIds, li, 1)}
                                    onDelete={() =>
                                      setToDelete({ kind: "lessons", id: lesson.id, label: lesson.title })
                                    }
                                  />
                                </div>
                              );
                            })}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              disabled={busy}
                              onClick={() =>
                                setDialog({
                                  mode: "create",
                                  kind: "lessons",
                                  parentId: chapter.id,
                                  title: "",
                                  slug: "",
                                  lessonType: "text",
                                })
                              }
                            >
                              <Plus className="h-3 w-3 mr-1" /> Neue Lektion
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    disabled={busy}
                    onClick={() =>
                      setDialog({
                        mode: "create",
                        kind: "chapters",
                        parentId: course.id,
                        title: "",
                        slug: "",
                        lessonType: "text",
                      })
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" /> Neues Kapitel
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create / edit dialog */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "create" ? "Neu anlegen" : "Bearbeiten"}
              {dialog ? ` · ${kindLabel(dialog.kind)}` : ""}
            </DialogTitle>
          </DialogHeader>
          {dialog && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Titel</Label>
                <Input
                  value={dialog.title}
                  autoFocus
                  onChange={(e) => setDialog({ ...dialog, title: e.target.value })}
                  placeholder="Titel"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug {dialog.mode === "create" ? "(optional)" : ""}</Label>
                <Input
                  value={dialog.slug}
                  onChange={(e) => setDialog({ ...dialog, slug: e.target.value })}
                  placeholder="wird-aus-dem-titel-generiert"
                />
              </div>
              {dialog.kind === "lessons" && dialog.mode === "create" && (
                <div className="space-y-1.5">
                  <Label>Typ</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={dialog.lessonType}
                    onChange={(e) =>
                      setDialog({ ...dialog, lessonType: e.target.value as "text" | "video" })
                    }
                  >
                    <option value="text">Text</option>
                    <option value="video">Video</option>
                  </select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={busy}>
              Abbrechen
            </Button>
            <Button onClick={submitDialog} disabled={busy || !dialog?.title.trim()}>
              {busy ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.label}
              {toDelete?.kind === "courses" &&
                " wird mit allen Kapiteln und Lektionen unwiderruflich gelöscht."}
              {toDelete?.kind === "chapters" &&
                " wird mit allen enthaltenen Lektionen unwiderruflich gelöscht."}
              {toDelete?.kind === "lessons" && " wird unwiderruflich gelöscht."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
              disabled={busy}
              className="bg-red-600 hover:bg-red-700"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function kindLabel(kind: Kind) {
  return kind === "courses" ? "Kurs" : kind === "chapters" ? "Kapitel" : "Lektion";
}

function PublishBadge({ published }: { published: boolean }) {
  return published ? (
    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
      live
    </Badge>
  ) : (
    <Badge variant="outline" className="text-[10px] text-muted-foreground">
      Entwurf
    </Badge>
  );
}

function RowActions({
  busy,
  published,
  onPublish,
  onEdit,
  editHref,
  onUp,
  onDown,
  onDelete,
}: {
  busy: boolean;
  published: boolean;
  onPublish: () => void;
  onEdit?: () => void;
  editHref?: string;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <IconBtn title="Nach oben" onClick={onUp} disabled={busy}>
        <ArrowUp className="h-3.5 w-3.5" />
      </IconBtn>
      <IconBtn title="Nach unten" onClick={onDown} disabled={busy}>
        <ArrowDown className="h-3.5 w-3.5" />
      </IconBtn>
      <IconBtn title={published ? "Auf Entwurf setzen" : "Veröffentlichen"} onClick={onPublish} disabled={busy}>
        {published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </IconBtn>
      {editHref ? (
        <Link
          href={editHref}
          title="Bearbeiten"
          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-black/5 hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      ) : onEdit ? (
        <IconBtn title="Umbenennen" onClick={onEdit} disabled={busy}>
          <Pencil className="h-3.5 w-3.5" />
        </IconBtn>
      ) : null}
      <IconBtn title="Löschen" onClick={onDelete} disabled={busy} danger>
        <Trash2 className="h-3.5 w-3.5" />
      </IconBtn>
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors disabled:opacity-40 ${
        danger
          ? "text-muted-foreground hover:bg-red-50 hover:text-red-600"
          : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
