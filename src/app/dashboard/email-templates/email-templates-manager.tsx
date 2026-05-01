"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertDialog, ConfirmDialog } from "@/components/confirm-dialog";
import { RichTextEditor } from "@/app/dashboard/inbox/rich-text-editor";
import { Pencil, Plus, Trash2 } from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  created_at: string;
  updated_at: string;
}

// Strip HTML for the table preview so we don't accidentally render
// arbitrary markup in the row.
function htmlToPreview(html: string, max = 120): string {
  if (typeof window === "undefined") return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const text = (tmp.textContent || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

export function EmailTemplatesManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertState, setAlertState] = useState<{ title: string; description: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);

  // Edit dialog state. `editing === null` means the dialog is closed,
  // `editing.id === null` means we're creating a new one.
  const [editing, setEditing] = useState<{
    id: string | null;
    name: string;
    subject: string;
    bodyHtml: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/email-templates");
    if (res.ok) {
      setTemplates(await res.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setAlertState({
        title: "Fehler",
        description: data.error || "Vorlagen konnten nicht geladen werden.",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditError(null);
    setEditing({ id: null, name: "", subject: "", bodyHtml: "" });
  };

  const openEdit = (t: EmailTemplate) => {
    setEditError(null);
    setEditing({
      id: t.id,
      name: t.name,
      subject: t.subject,
      bodyHtml: t.body_html,
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setEditError(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      setEditError("Bitte einen Namen für die Vorlage angeben.");
      return;
    }
    setSaving(true);
    const isCreate = editing.id === null;
    const res = await fetch(
      isCreate
        ? "/api/admin/email-templates"
        : `/api/admin/email-templates/${editing.id}`,
      {
        method: isCreate ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name.trim(),
          subject: editing.subject,
          bodyHtml: editing.bodyHtml,
        }),
      },
    );
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error || "Speichern fehlgeschlagen.");
      return;
    }
    closeEdit();
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const res = await fetch(`/api/admin/email-templates/${target.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAlertState({
        title: "Fehler",
        description: data.error || "Vorlage konnte nicht gelöscht werden.",
      });
      return;
    }
    setTemplates((prev) => prev.filter((t) => t.id !== target.id));
  };

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
        title="Vorlage löschen?"
        description={
          deleteTarget
            ? `Die Vorlage „${deleteTarget.name}“ wird unwiderruflich gelöscht.`
            : ""
        }
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Vorlage bearbeiten" : "Neue Vorlage"}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  placeholder="z.B. Buchungsbestätigung allgemein"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Nur intern sichtbar, hilft Dir die Vorlage später zu finden.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Betreff</Label>
                <Input
                  value={editing.subject}
                  onChange={(e) =>
                    setEditing({ ...editing, subject: e.target.value })
                  }
                  placeholder="Betreff für die E-Mail (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label>Inhalt</Label>
                <RichTextEditor
                  value={editing.bodyHtml}
                  onChange={(html) =>
                    setEditing({ ...editing, bodyHtml: html })
                  }
                  placeholder="Vorlagentext..."
                  className="min-h-[260px]"
                  aiContext={{
                    to: "",
                    subject: editing.subject,
                    threadId: null,
                    mode: "template",
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Variable: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">{"{{Vorname}}"}</code> wird beim Versenden durch den Vornamen der Empfänger:in ersetzt. Funktioniert auch im Betreff. Persönliche Signatur bitte nicht in der Vorlage hinzufügen, die wird automatisch ergänzt.
                </p>
              </div>

              {editError && (
                <p className="text-sm text-destructive">{editError}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeEdit} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Wird gespeichert..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between gap-4 mb-6">
        <span className="text-sm text-muted-foreground">
          {templates.length} {templates.length === 1 ? "Vorlage" : "Vorlagen"}
        </span>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Neue Vorlage
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Lade Vorlagen...
        </div>
      ) : templates.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Noch keine Vorlagen erstellt.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Betreff</TableHead>
              <TableHead className="hidden xl:table-cell">Inhalt</TableHead>
              <TableHead className="hidden xl:table-cell whitespace-nowrap">
                Geändert
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium text-sm">{t.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t.subject || <span className="italic">ohne Betreff</span>}
                </TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-muted-foreground max-w-[320px]">
                  <span className="line-clamp-2">
                    {htmlToPreview(t.body_html) || "–"}
                  </span>
                </TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(t.updated_at), "dd.MM.yyyy, HH:mm", {
                    locale: de,
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(t)}
                      title="Bearbeiten"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(t)}
                      title="Löschen"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
