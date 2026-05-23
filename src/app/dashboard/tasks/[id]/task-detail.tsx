"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  ArrowLeft,
  Trash2,
  Paperclip,
  Download,
  MessageSquare,
  GraduationCap,
  CalendarClock,
  Save,
  Upload,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ConfirmDialog, AlertDialog } from "@/components/confirm-dialog";
import type {
  Task,
  TaskAttachment,
  TaskCourseSessionRef,
  TaskNote,
  TaskProfileRef,
  TaskStatus,
} from "@/lib/types";

interface Props {
  initialTask: Task;
  initialNotes: TaskNote[];
  initialAttachments: TaskAttachment[];
  staff: TaskProfileRef[];
  courseSessions: TaskCourseSessionRef[];
  currentUserId: string;
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  open: "Offen",
  in_progress: "In Arbeit",
  done: "Erledigt",
};

const STATUS_TONE: Record<TaskStatus, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  done: "bg-emerald-100 text-emerald-800",
};

function displayName(p: TaskProfileRef | null | undefined): string {
  if (!p) return "Nicht zugewiesen";
  const parts = [p.title, p.first_name, p.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "Unbekannt";
}

function sessionLabel(s: TaskCourseSessionRef | null | undefined): string {
  if (!s) return "Kein Kurs";
  const date = s.date_iso
    ? format(new Date(s.date_iso), "dd.MM.yyyy", { locale: de })
    : "";
  const base = s.label_de || "Kurstermin";
  return [date, base].filter(Boolean).join(", ");
}

function formatBytes(n: number | null | undefined): string {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskDetail({
  initialTask,
  initialNotes,
  initialAttachments,
  staff,
  courseSessions,
  currentUserId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [task, setTask] = useState<Task>(initialTask);
  const [notes, setNotes] = useState<TaskNote[]>(initialNotes);
  const [attachments, setAttachments] =
    useState<TaskAttachment[]>(initialAttachments);

  // Editable fields
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [savingMeta, setSavingMeta] = useState(false);

  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [deleteAttachment, setDeleteAttachment] =
    useState<TaskAttachment | null>(null);
  const [deleteNote, setDeleteNote] = useState<TaskNote | null>(null);
  const [deleteTask, setDeleteTask] = useState(false);
  const [busy, setBusy] = useState(false);
  const [alertState, setAlertState] = useState<
    { title: string; description: string } | null
  >(null);

  const metaDirty =
    title.trim() !== task.title ||
    (description || "") !== (task.description || "") ||
    (dueDate || "") !== (task.due_date || "");

  const handleSaveMeta = async () => {
    if (!title.trim()) {
      setAlertState({
        title: "Fehler",
        description: "Bitte einen Titel angeben.",
      });
      return;
    }
    setSavingMeta(true);
    const { error } = await supabase
      .from("tasks")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
      })
      .eq("id", task.id);
    setSavingMeta(false);
    if (error) {
      setAlertState({ title: "Fehler", description: error.message });
      return;
    }
    setTask((t) => ({
      ...t,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
    }));
  };

  const handleStatusChange = async (status: TaskStatus) => {
    const prev = task;
    setTask((t) => ({ ...t, status }));
    const { error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", task.id);
    if (error) {
      setTask(prev);
      setAlertState({ title: "Fehler", description: error.message });
    }
  };

  const handleAssigneeChange = async (assigneeId: string | null) => {
    const next = !assigneeId || assigneeId === "__none__" ? null : assigneeId;
    const assignee = next ? staff.find((s) => s.id === next) ?? null : null;
    const prev = task;
    setTask((t) => ({ ...t, assigned_to: next, assignee }));
    const { error } = await supabase
      .from("tasks")
      .update({ assigned_to: next })
      .eq("id", task.id);
    if (error) {
      setTask(prev);
      setAlertState({ title: "Fehler", description: error.message });
    }
  };

  const handleCourseChange = async (courseId: string | null) => {
    const next = !courseId || courseId === "__none__" ? null : courseId;
    const course_session = next
      ? courseSessions.find((c) => c.id === next) ?? null
      : null;
    const prev = task;
    setTask((t) => ({ ...t, course_session_id: next, course_session }));
    const { error } = await supabase
      .from("tasks")
      .update({ course_session_id: next })
      .eq("id", task.id);
    if (error) {
      setTask(prev);
      setAlertState({ title: "Fehler", description: error.message });
    }
  };

  const handleAddNote = async () => {
    const body = newNote.trim();
    if (!body) return;
    setAddingNote(true);
    const { data, error } = await supabase
      .from("task_notes")
      .insert({ task_id: task.id, author_id: currentUserId, body })
      .select(
        "id, task_id, author_id, body, created_at, author:profiles!task_notes_author_id_fkey(id, title, first_name, last_name)",
      )
      .single();
    setAddingNote(false);
    if (error || !data) {
      setAlertState({
        title: "Fehler",
        description: error?.message || "Notiz konnte nicht gespeichert werden.",
      });
      return;
    }
    setNotes((prev) => [data as unknown as TaskNote, ...prev]);
    setNewNote("");
  };

  const handleDeleteNote = async () => {
    if (!deleteNote) return;
    setBusy(true);
    const { error } = await supabase
      .from("task_notes")
      .delete()
      .eq("id", deleteNote.id);
    setBusy(false);
    if (error) {
      setAlertState({ title: "Fehler", description: error.message });
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== deleteNote.id));
    }
    setDeleteNote(null);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/admin/tasks/${task.id}/attachments`, {
      method: "POST",
      body: form,
    });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAlertState({
        title: "Upload fehlgeschlagen",
        description:
          data?.error || `Datei konnte nicht hochgeladen werden (${res.status}).`,
      });
      return;
    }
    const data = (await res.json()) as { attachment: TaskAttachment };
    setAttachments((prev) => [data.attachment, ...prev]);
  };

  const handleDeleteAttachment = async () => {
    if (!deleteAttachment) return;
    setBusy(true);
    const res = await fetch(
      `/api/admin/tasks/${task.id}/attachments/${deleteAttachment.id}`,
      { method: "DELETE" },
    );
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAlertState({
        title: "Fehler",
        description: data?.error || "Anhang konnte nicht gelöscht werden.",
      });
    } else {
      setAttachments((prev) =>
        prev.filter((a) => a.id !== deleteAttachment.id),
      );
    }
    setDeleteAttachment(null);
  };

  const handleDownload = async (att: TaskAttachment) => {
    const res = await fetch(
      `/api/admin/tasks/${task.id}/attachments/${att.id}`,
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAlertState({
        title: "Download fehlgeschlagen",
        description: data?.error || "Signierte URL konnte nicht erzeugt werden.",
      });
      return;
    }
    const { url } = (await res.json()) as { url: string };
    window.open(url, "_blank", "noopener");
  };

  const handleDeleteTask = async () => {
    setBusy(true);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    setBusy(false);
    if (error) {
      setAlertState({ title: "Fehler", description: error.message });
      setDeleteTask(false);
      return;
    }
    router.push("/dashboard/tasks");
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDateObj = task.due_date ? new Date(task.due_date) : null;
  const overdue =
    dueDateObj !== null && task.status !== "done" && dueDateObj < today;

  return (
    <div className="space-y-6 max-w-5xl">
      <AlertDialog
        open={!!alertState}
        title={alertState?.title ?? ""}
        description={alertState?.description ?? ""}
        onClose={() => setAlertState(null)}
      />
      <ConfirmDialog
        open={!!deleteAttachment}
        title="Anhang löschen"
        description={`Möchtest Du "${deleteAttachment?.file_name ?? ""}" wirklich löschen?`}
        confirmLabel={busy ? "Wird gelöscht..." : "Löschen"}
        variant="destructive"
        onConfirm={handleDeleteAttachment}
        onCancel={() => setDeleteAttachment(null)}
      />
      <ConfirmDialog
        open={!!deleteNote}
        title="Notiz löschen"
        description="Möchtest Du diese Notiz wirklich löschen?"
        confirmLabel={busy ? "Wird gelöscht..." : "Löschen"}
        variant="destructive"
        onConfirm={handleDeleteNote}
        onCancel={() => setDeleteNote(null)}
      />
      <ConfirmDialog
        open={deleteTask}
        title="Aufgabe löschen"
        description="Möchtest Du diese Aufgabe inklusive Notizen und Anhänge wirklich löschen?"
        confirmLabel={busy ? "Wird gelöscht..." : "Endgültig löschen"}
        variant="destructive"
        onConfirm={handleDeleteTask}
        onCancel={() => setDeleteTask(false)}
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/dashboard/tasks"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteTask(true)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          Aufgabe löschen
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-1.5">
            <Label>Titel</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Beschreibung</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Optionaler Kontext."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={task.status}
                onValueChange={(v) => handleStatusChange(v as TaskStatus)}
              >
                <SelectTrigger className={`${STATUS_TONE[task.status]} border-0`}>
                  <span>{STATUS_LABEL[task.status]}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Offen</SelectItem>
                  <SelectItem value="in_progress">In Arbeit</SelectItem>
                  <SelectItem value="done">Erledigt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Zugewiesen an</Label>
              <Select
                value={task.assigned_to || "__none__"}
                onValueChange={handleAssigneeChange}
              >
                <SelectTrigger>
                  <span>{displayName(task.assignee)}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Niemandem</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {displayName(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Fällig am</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                {overdue && (
                  <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium whitespace-nowrap">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Überfällig
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Kurstermin</Label>
              <Select
                value={task.course_session_id || "__none__"}
                onValueChange={handleCourseChange}
              >
                <SelectTrigger>
                  <span className="truncate">
                    {sessionLabel(task.course_session)}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Kein Kurs</SelectItem>
                  {courseSessions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {sessionLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {task.course_session && (
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground pt-1">
                  <GraduationCap className="h-3.5 w-3.5 mt-0.5 text-[#0066FF]" />
                  <span>
                    {task.course_session.instructor_name || "Dozent:in offen"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Erstellt von {displayName(task.creator)} am{" "}
              {format(new Date(task.created_at), "dd.MM.yyyy HH:mm", {
                locale: de,
              })}
            </div>
            <Button
              onClick={handleSaveMeta}
              disabled={!metaDirty || savingMeta}
              size="sm"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {savingMeta ? "Speichern..." : "Speichern"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold inline-flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Anhänge
              <span className="text-xs text-muted-foreground font-normal">
                ({attachments.length})
              </span>
            </h2>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-1.5" />
                {uploading ? "Wird hochgeladen..." : "Datei hochladen"}
              </Button>
            </div>
          </div>

          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Noch keine Anhänge.
            </p>
          ) : (
            <ul className="divide-y">
              {attachments.map((att) => (
                <li
                  key={att.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => handleDownload(att)}
                    className="flex items-center gap-3 min-w-0 text-left group"
                  >
                    <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-[#0066FF]">
                        {att.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(att.file_size)}
                        {att.uploader && (
                          <>
                            {", "}
                            hochgeladen von {displayName(att.uploader)}
                          </>
                        )}
                        {", "}
                        {format(new Date(att.created_at), "dd.MM.yyyy HH:mm", {
                          locale: de,
                        })}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(att)}
                      title="Herunterladen"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteAttachment(att)}
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-base font-semibold inline-flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Notizen
            <span className="text-xs text-muted-foreground font-normal">
              ({notes.length})
            </span>
          </h2>

          <div className="space-y-2">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              placeholder="Notiz schreiben..."
            />
            <div className="flex justify-end">
              <Button
                onClick={handleAddNote}
                disabled={addingNote || !newNote.trim()}
                size="sm"
              >
                {addingNote ? "Wird gespeichert..." : "Notiz hinzufügen"}
              </Button>
            </div>
          </div>

          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Noch keine Notizen.
            </p>
          ) : (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg bg-muted/50 px-4 py-3 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {displayName(n.author)},{" "}
                      {format(new Date(n.created_at), "dd.MM.yyyy HH:mm", {
                        locale: de,
                      })}
                    </p>
                    {n.author_id === currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteNote(n)}
                        className="h-7 px-2"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
