"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Plus, Trash2, GraduationCap, CalendarClock } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog, AlertDialog } from "@/components/confirm-dialog";
import { TableHeaderBar } from "@/components/table/table-header-bar";
import { SortableHead } from "@/components/table/sortable-head";
import { useTableSort } from "@/hooks/use-table-sort";
import type {
  Task,
  TaskCourseSessionRef,
  TaskProfileRef,
  TaskStatus,
} from "@/lib/types";

interface Props {
  initialTasks: Task[];
  staff: TaskProfileRef[];
  courseSessions: TaskCourseSessionRef[];
  currentUserId: string;
  role: "admin" | "nutzer";
}

type SortKey =
  | "title"
  | "assignee"
  | "status"
  | "course"
  | "due_date"
  | "created";

type StatusFilter = "all" | TaskStatus;

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
  if (!s) return "";
  const date = s.date_iso
    ? format(new Date(s.date_iso), "dd.MM.yyyy", { locale: de })
    : "";
  const base = s.label_de || "Kurstermin";
  return [date, base].filter(Boolean).join(", ");
}

export function TasksManager({
  initialTasks,
  staff,
  courseSessions,
  currentUserId,
  role,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const isAdmin = role === "admin";

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  // "Nur meine" is only meaningful for admins; nutzer only see their own.
  const [mineOnly, setMineOnly] = useState(false);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignee, setNewAssignee] = useState<string>("");
  const [newCourseId, setNewCourseId] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState<string>("");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [alertState, setAlertState] = useState<
    { title: string; description: string } | null
  >(null);

  const { sortKey, sortDir, handleSort } = useTableSort<SortKey>(
    "created",
    "desc",
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (mineOnly && t.assigned_to !== currentUserId) return false;
      if (!q) return true;
      const hay = [
        t.title,
        t.description ?? "",
        displayName(t.assignee),
        sessionLabel(t.course_session),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [tasks, search, statusFilter, mineOnly, currentUserId]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "title":
          return a.title.localeCompare(b.title) * dir;
        case "assignee":
          return displayName(a.assignee).localeCompare(displayName(b.assignee)) *
            dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "course":
          return sessionLabel(a.course_session).localeCompare(
            sessionLabel(b.course_session),
          ) * dir;
        case "due_date": {
          const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          return (da - db) * dir;
        }
        case "created":
          return (
            (new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()) *
            dir
          );
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const resetCreateForm = () => {
    setNewTitle("");
    setNewDescription("");
    setNewAssignee("");
    setNewCourseId("");
    setNewDueDate("");
    setCreateError(null);
  };

  const openCreate = () => {
    resetCreateForm();
    setShowCreate(true);
  };

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title) {
      setCreateError("Bitte einen Titel eingeben.");
      return;
    }
    setCreating(true);
    setCreateError(null);

    // Nutzer can only create self-assigned tasks (they would lose visibility
    // otherwise, and RLS would block any other assignee anyway).
    const insertRow = {
      title,
      description: newDescription.trim() || null,
      assigned_to: isAdmin ? newAssignee || null : currentUserId,
      created_by: currentUserId,
      course_session_id: newCourseId || null,
      due_date: newDueDate || null,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert(insertRow)
      .select(
        `id, title, description, status, assigned_to, created_by,
         course_session_id, due_date, created_at, updated_at,
         assignee:profiles!tasks_assigned_to_fkey(id, title, first_name, last_name),
         creator:profiles!tasks_created_by_fkey(id, title, first_name, last_name),
         course_session:course_sessions!tasks_course_session_id_fkey(id, date_iso, label_de, instructor_name)`,
      )
      .single();

    setCreating(false);
    if (error || !data) {
      setCreateError(error?.message || "Aufgabe konnte nicht erstellt werden.");
      return;
    }
    setTasks((prev) => [data as unknown as Task, ...prev]);
    setShowCreate(false);
    resetCreateForm();
  };

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    const prev = tasks;
    setTasks((curr) =>
      curr.map((t) => (t.id === task.id ? { ...t, status } : t)),
    );
    const { error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", task.id);
    if (error) {
      setTasks(prev);
      setAlertState({
        title: "Fehler",
        description: error.message,
      });
    }
  };

  const handleAssigneeChange = async (task: Task, assigneeId: string) => {
    const next = assigneeId || null;
    const assignee =
      next === null ? null : staff.find((s) => s.id === next) ?? null;
    const prev = tasks;
    setTasks((curr) =>
      curr.map((t) =>
        t.id === task.id ? { ...t, assigned_to: next, assignee } : t,
      ),
    );
    const { error } = await supabase
      .from("tasks")
      .update({ assigned_to: next })
      .eq("id", task.id);
    if (error) {
      setTasks(prev);
      setAlertState({ title: "Fehler", description: error.message });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      setAlertState({ title: "Fehler", description: error.message });
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      <AlertDialog
        open={!!alertState}
        title={alertState?.title ?? ""}
        description={alertState?.description ?? ""}
        onClose={() => setAlertState(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Aufgabe löschen"
        description={`Möchtest Du die Aufgabe "${deleteTarget?.title ?? ""}" wirklich löschen? Notizen und Anhänge werden mitgelöscht.`}
        confirmLabel={deleting ? "Wird gelöscht..." : "Endgültig löschen"}
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Create dialog */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false);
            resetCreateForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Neue Aufgabe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Titel *</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Was ist zu tun?"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Beschreibung</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optionaler Kontext, Links, etc."
                rows={3}
              />
            </div>
            <div
              className={
                isAdmin
                  ? "grid grid-cols-2 gap-3"
                  : "grid grid-cols-1 gap-3"
              }
            >
              {isAdmin && (
                <div className="space-y-1.5">
                  <Label>Zugewiesen an</Label>
                  <Select
                    value={newAssignee || "__none__"}
                    onValueChange={(v) =>
                      setNewAssignee(!v || v === "__none__" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <span>
                        {newAssignee
                          ? displayName(
                              staff.find((s) => s.id === newAssignee) ?? null,
                            )
                          : "Niemandem"}
                      </span>
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
              )}
              <div className="space-y-1.5">
                <Label>Fällig am</Label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Kurstermin (optional)</Label>
              <Select
                value={newCourseId || "__none__"}
                onValueChange={(v) =>
                  setNewCourseId(!v || v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger>
                  <span>
                    {newCourseId
                      ? sessionLabel(
                          courseSessions.find((c) => c.id === newCourseId) ??
                            null,
                        )
                      : "Kein Kurs"}
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
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                resetCreateForm();
              }}
              disabled={creating}
            >
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Wird angelegt..." : "Aufgabe anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TableHeaderBar
        title="Aufgaben"
        count={filtered.length}
        countLabel="Aufgaben"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Suchen nach Titel, Person, Kurs..."
        filters={
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <span>
                  {statusFilter === "all"
                    ? "Alle Status"
                    : STATUS_LABEL[statusFilter]}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="open">Offen</SelectItem>
                <SelectItem value="in_progress">In Arbeit</SelectItem>
                <SelectItem value="done">Erledigt</SelectItem>
              </SelectContent>
            </Select>
            {isAdmin && (
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mineOnly}
                  onChange={(e) => setMineOnly(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span>Nur meine</span>
              </label>
            )}
          </div>
        }
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Neue Aufgabe
          </Button>
        }
      />

      {sorted.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          {tasks.length === 0
            ? "Noch keine Aufgaben angelegt."
            : "Keine Aufgaben passen zu den aktuellen Filtern."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Titel"
                sortKey="title"
                currentKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              {isAdmin && (
                <SortableHead
                  label="Zugewiesen"
                  sortKey="assignee"
                  currentKey={sortKey}
                  direction={sortDir}
                  onSort={handleSort}
                />
              )}
              <SortableHead
                label="Status"
                sortKey="status"
                currentKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Kurs"
                sortKey="course"
                currentKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Fällig"
                sortKey="due_date"
                currentKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Angelegt"
                sortKey="created"
                currentKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((t) => {
              const dueDate = t.due_date ? new Date(t.due_date) : null;
              const overdue =
                dueDate !== null && t.status !== "done" && dueDate < today;
              return (
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-black/[0.03]"
                  onClick={() => router.push(`/dashboard/tasks/${t.id}`)}
                >
                  <TableCell className="font-medium align-top">
                    <div className="flex flex-col gap-0.5">
                      <span>{t.title}</span>
                      {t.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {t.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell
                      className="align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Select
                        value={t.assigned_to || "__none__"}
                        onValueChange={(v) =>
                          handleAssigneeChange(
                            t,
                            !v || v === "__none__" ? "" : v,
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-[180px]">
                          <span className="truncate">
                            {displayName(t.assignee)}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            Nicht zugewiesen
                          </SelectItem>
                          {staff.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {displayName(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  <TableCell
                    className="align-top"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Select
                      value={t.status}
                      onValueChange={(v) =>
                        handleStatusChange(t, v as TaskStatus)
                      }
                    >
                      <SelectTrigger
                        className={`h-8 w-[130px] border-0 ${STATUS_TONE[t.status]}`}
                      >
                        <span>{STATUS_LABEL[t.status]}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Offen</SelectItem>
                        <SelectItem value="in_progress">In Arbeit</SelectItem>
                        <SelectItem value="done">Erledigt</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="align-top">
                    {t.course_session ? (
                      <div className="flex items-start gap-1.5 text-sm">
                        <GraduationCap className="h-4 w-4 mt-0.5 text-[#0066FF] shrink-0" />
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium">
                            {t.course_session.date_iso
                              ? format(
                                  new Date(t.course_session.date_iso),
                                  "dd.MM.yyyy",
                                  { locale: de },
                                )
                              : ""}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t.course_session.label_de || "Kurstermin"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">·</span>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    {dueDate ? (
                      <div
                        className={`flex items-center gap-1.5 text-sm ${overdue ? "text-red-600 font-medium" : ""}`}
                      >
                        {overdue && <CalendarClock className="h-4 w-4" />}
                        {format(dueDate, "dd.MM.yyyy", { locale: de })}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">·</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap align-top">
                    {format(new Date(t.created_at), "dd.MM.yyyy", {
                      locale: de,
                    })}
                  </TableCell>
                  <TableCell
                    className="align-top"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(t)}
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
