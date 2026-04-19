"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dozent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Plus, Trash2, Edit } from "lucide-react";
import { formatPersonName } from "@/lib/utils";

interface Props {
  initialDozenten: Dozent[];
}

export function formatDozentName(d: Dozent): string {
  return formatPersonName({ title: d.title, firstName: d.first_name, lastName: d.last_name }) || "";
}

export function DozentenManager({ initialDozenten }: Props) {
  const [dozenten, setDozenten] = useState(initialDozenten);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Dozent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [dTitle, setDTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const supabase = createClient();

  const resetForm = () => {
    setDTitle("");
    setFirstName("");
    setLastName("");
    setEditing(null);
  };

  const handleSave = async () => {
    if (!lastName.trim()) return;

    const payload = {
      title: dTitle.trim() || null,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    };

    setDialogOpen(false);
    resetForm();

    if (editing) {
      const { data, error } = await supabase
        .from("dozenten")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();

      if (!error && data) {
        setDozenten((prev) => prev.map((d) => (d.id === data.id ? data : d)));
      }
    } else {
      const { data, error } = await supabase
        .from("dozenten")
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        setDozenten((prev) => [...prev, data].sort((a, b) => a.last_name.localeCompare(b.last_name)));
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { error } = await supabase.from("dozenten").delete().eq("id", deleteConfirm);
    if (!error) {
      setDozenten((prev) => prev.filter((d) => d.id !== deleteConfirm));
    }
    setDeleteConfirm(null);
  };

  const openEdit = (d: Dozent) => {
    setEditing(d);
    setDTitle(d.title || "");
    setFirstName(d.first_name);
    setLastName(d.last_name);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Dozent:in löschen"
        description="Dozent:in wirklich löschen?"
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Dozent:in bearbeiten" : "Neue:r Dozent:in"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="d_title">Titel</Label>
              <Input
                id="d_title"
                value={dTitle}
                onChange={(e) => setDTitle(e.target.value)}
                placeholder="z.B. Dr. med., Prof. Dr."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="d_first">Vorname</Label>
                <Input
                  id="d_first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Sophia"
                />
              </div>
              <div>
                <Label htmlFor="d_last">Nachname *</Label>
                <Input
                  id="d_last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Wilk-Vollmann"
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-md p-3 text-sm">
              <span className="text-muted-foreground">Vorschau: </span>
              <span className="font-medium">
                {[dTitle.trim(), firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || "—"}
              </span>
            </div>

            <Button onClick={handleSave} className="w-full" disabled={!lastName.trim()}>
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dozent:innen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Verwalte die Ärzt:innen, die als Kursleitende zur Verfügung stehen.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Neue:r Dozent:in
        </Button>
      </div>

      {/* List */}
      {dozenten.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Noch keine Dozent:innen angelegt.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {dozenten.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium">{formatDozentName(d)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(d.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
