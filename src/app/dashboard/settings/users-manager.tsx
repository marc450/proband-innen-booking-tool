"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Trash2, RefreshCw, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { AdminUser } from "./page";

interface Props {
  initialUsers: AdminUser[];
  currentUserId: string;
}

export function UsersManager({ initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [alertState, setAlertState] = useState<{
    title: string;
    description: string;
  } | null>(null);

  // Create form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "dozent">("dozent");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#";
    let pw = "";
    for (let i = 0; i < 12; i++) {
      pw += chars[Math.floor(Math.random() * chars.length)];
    }
    setPassword(pw);
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setRole("dozent");
    setCreateError(null);
    setCreatedCredentials(null);
    setCopied(false);
  };

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setCreateError("Bitte alle Felder ausfüllen.");
      return;
    }
    if (password.length < 8) {
      setCreateError("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    setSaving(true);
    setCreateError(null);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        role,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setCreateError(data.error || "Fehler beim Erstellen des Benutzers.");
      return;
    }

    // Show credentials so admin can share them
    setCreatedCredentials({ email, password });

    // Refresh list
    const listRes = await fetch("/api/admin/users");
    if (listRes.ok) setUsers(await listRes.json());
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    navigator.clipboard.writeText(
      `Login: ${createdCredentials.email}\nPasswort: ${createdCredentials.password}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
      method: "DELETE",
    });
    const data = await res.json();

    if (!res.ok) {
      setAlertState({
        title: "Fehler",
        description: data.error || "Benutzer konnte nicht gelöscht werden.",
      });
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    }

    setDeleting(false);
    setDeleteTarget(null);
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
        title="Benutzer löschen"
        description={`Möchtest Du ${
          deleteTarget?.first_name && deleteTarget?.last_name
            ? `${deleteTarget.first_name} ${deleteTarget.last_name}`
            : deleteTarget?.email
        } wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
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
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {createdCredentials ? "Benutzer erstellt" : "Neuen Benutzer anlegen"}
            </DialogTitle>
          </DialogHeader>

          {createdCredentials ? (
            /* Step 2: Show credentials */
            <>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  Der Benutzer wurde angelegt. Teile die Zugangsdaten persönlich oder per sicherem Kanal mit.
                </p>
                <div className="rounded-lg bg-muted px-4 py-3 space-y-1.5 font-mono text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs uppercase tracking-wide">Login</span>
                    <p className="font-medium">{createdCredentials.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs uppercase tracking-wide">Passwort</span>
                    <p className="font-medium">{createdCredentials.password}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Der Benutzer kann das Passwort nach dem Login jederzeit über das Schlüssel-Symbol oben rechts ändern.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCopyCredentials} className="gap-1.5">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Kopiert" : "Kopieren"}
                </Button>
                <Button onClick={() => { setShowCreate(false); resetForm(); }}>
                  Fertig
                </Button>
              </DialogFooter>
            </>
          ) : (
            /* Step 1: Create form */
            <>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Vorname *</Label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Max"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nachname *</Label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Mustermann"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>E-Mail-Adresse *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="max@ephia.de"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Temporäres Passwort *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mindestens 8 Zeichen"
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={generatePassword}
                      title="Passwort generieren"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Rolle</Label>
                  <Select
                    value={role}
                    onValueChange={(val) => setRole(val as "admin" | "dozent")}
                  >
                    <SelectTrigger>
                      <span>{role === "admin" ? "Admin" : "Dozent:in"}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dozent">Dozent:in</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
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
                  onClick={() => { setShowCreate(false); resetForm(); }}
                  disabled={saving}
                >
                  Abbrechen
                </Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? "Wird angelegt..." : "Benutzer anlegen"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Dozent:innen haben Zugang zu allen Bereichen außer Einstellungen.
        </p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Benutzer anlegen
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Noch keine Benutzer vorhanden.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Seit</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {u.first_name && u.last_name ? (
                        `${u.first_name} ${u.last_name}`
                      ) : (
                        <span className="text-muted-foreground italic">
                          Kein Name
                        </span>
                      )}
                      {u.id === currentUserId && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (Du)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      {u.role === "admin" ? (
                        <Badge>Admin</Badge>
                      ) : (
                        <Badge variant="secondary">Dozent:in</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(u.created_at), "dd.MM.yyyy", {
                        locale: de,
                      })}
                    </TableCell>
                    <TableCell>
                      {u.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(u)}
                          title="Benutzer löschen"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
