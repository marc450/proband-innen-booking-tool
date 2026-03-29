"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { CourseTemplate } from "@/lib/types";

interface Props {
  initialOfferings: CourseTemplate[];
}

type SortKey = "status" | "name" | "online" | "praxis" | "kombi";
type SortDir = "asc" | "desc";

function formatPrice(p: number | null | undefined) {
  if (!p) return "–";
  return `€${p.toLocaleString("de-DE")}`;
}

export function CourseOfferingManager({ initialOfferings }: Props) {
  const supabase = createClient();
  const [offerings, setOfferings] = useState(initialOfferings);
  const [editing, setEditing] = useState<CourseTemplate | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Form fields
  const [form, setForm] = useState<Record<string, string>>({});

  const openCreate = () => {
    setEditing(null);
    setForm({
      course_key: "",
      course_label_de: "",
      name_online: "",
      name_praxis: "",
      name_kombi: "",
      price_gross_online: "",
      price_gross_praxis: "",
      price_gross_kombi: "",
      vat_rate_online: "0.19",
      vat_rate_praxis: "0.19",
      vat_rate_kombi: "0.19",
      description_online: "",
      description_praxis: "",
      description_kombi: "",
      success_url_online: "https://www.ephia.de/vielen-lieben-dank",
      success_url_praxis: "https://www.ephia.de/vielen-lieben-dank-praxiskurs",
      success_url_kombi: "https://www.ephia.de/vielen-lieben-dank",
      cancel_url_online: "",
      cancel_url_praxis: "",
      cancel_url_kombi: "",
      online_course_id: "",
      status: "draft",
    });
    setShowDialog(true);
  };

  const openEdit = (o: CourseTemplate) => {
    setEditing(o);
    setForm({
      course_key: o.course_key || "",
      course_label_de: o.course_label_de || "",
      name_online: o.name_online || "",
      name_praxis: o.name_praxis || "",
      name_kombi: o.name_kombi || "",
      price_gross_online: o.price_gross_online?.toString() || "",
      price_gross_praxis: o.price_gross_praxis?.toString() || "",
      price_gross_kombi: o.price_gross_kombi?.toString() || "",
      vat_rate_online: o.vat_rate_online?.toString() || "0.19",
      vat_rate_praxis: o.vat_rate_praxis?.toString() || "0.19",
      vat_rate_kombi: o.vat_rate_kombi?.toString() || "0.19",
      description_online: o.description_online || "",
      description_praxis: o.description_praxis || "",
      description_kombi: o.description_kombi || "",
      success_url_online: o.success_url_online || "",
      success_url_praxis: o.success_url_praxis || "",
      success_url_kombi: o.success_url_kombi || "",
      cancel_url_online: o.cancel_url_online || "",
      cancel_url_praxis: o.cancel_url_praxis || "",
      cancel_url_kombi: o.cancel_url_kombi || "",
      online_course_id: o.online_course_id || "",
      status: o.status || "draft",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    const payload = {
      title: form.course_label_de || form.course_key,
      course_key: form.course_key || null,
      course_label_de: form.course_label_de || null,
      name_online: form.name_online || null,
      name_praxis: form.name_praxis || null,
      name_kombi: form.name_kombi || null,
      price_gross_online: form.price_gross_online ? parseFloat(form.price_gross_online) : null,
      price_gross_praxis: form.price_gross_praxis ? parseFloat(form.price_gross_praxis) : null,
      price_gross_kombi: form.price_gross_kombi ? parseFloat(form.price_gross_kombi) : null,
      vat_rate_online: form.vat_rate_online ? parseFloat(form.vat_rate_online) : null,
      vat_rate_praxis: form.vat_rate_praxis ? parseFloat(form.vat_rate_praxis) : null,
      vat_rate_kombi: form.vat_rate_kombi ? parseFloat(form.vat_rate_kombi) : null,
      description_online: form.description_online || null,
      description_praxis: form.description_praxis || null,
      description_kombi: form.description_kombi || null,
      success_url_online: form.success_url_online || null,
      success_url_praxis: form.success_url_praxis || null,
      success_url_kombi: form.success_url_kombi || null,
      cancel_url_online: form.cancel_url_online || null,
      cancel_url_praxis: form.cancel_url_praxis || null,
      cancel_url_kombi: form.cancel_url_kombi || null,
      online_course_id: form.online_course_id || null,
      status: form.status || "draft",
    };

    if (editing) {
      const { data, error } = await supabase
        .from("course_templates")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (!error && data) {
        setOfferings((prev) => prev.map((o) => (o.id === editing.id ? data as CourseTemplate : o)));
        setShowDialog(false);
      }
    } else {
      const { data, error } = await supabase
        .from("course_templates")
        .insert(payload)
        .select()
        .single();
      if (!error && data) {
        setOfferings((prev) => [...prev, data as CourseTemplate]);
        setShowDialog(false);
      }
    }
  };

  const toggleStatus = async (o: CourseTemplate) => {
    const newStatus = o.status === "live" ? "draft" : "live";
    const { error } = await supabase
      .from("course_templates")
      .update({ status: newStatus })
      .eq("id", o.id);
    if (!error) {
      setOfferings((prev) => prev.map((x) => (x.id === o.id ? { ...x, status: newStatus } : x)));
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("course_templates").delete().eq("id", deleteId);
    if (!error) {
      setOfferings((prev) => prev.filter((o) => o.id !== deleteId));
    }
    setDeleteId(null);
  };

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedOfferings = useMemo(() => {
    const sorted = [...offerings];
    const dir = sortDir === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "status":
          return ((a.status === "live" ? 1 : 0) - (b.status === "live" ? 1 : 0)) * -dir;
        case "name":
          return (a.course_label_de || a.title || "").localeCompare(b.course_label_de || b.title || "") * dir;
        case "online":
          return ((a.price_gross_online || 0) - (b.price_gross_online || 0)) * dir;
        case "praxis":
          return ((a.price_gross_praxis || 0) - (b.price_gross_praxis || 0)) * dir;
        case "kombi":
          return ((a.price_gross_kombi || 0) - (b.price_gross_kombi || 0)) * dir;
        default:
          return 0;
      }
    });
    return sorted;
  }, [offerings, sortKey, sortDir]);

  const SortableHead = ({ label, sortKeyName, className }: { label: string; sortKeyName: SortKey; className?: string }) => (
    <TableHead className={className}>
      <button
        onClick={() => toggleSort(sortKeyName)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kursangebot</h1>
        <Button onClick={openCreate}>Neues Kursangebot</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="Status" sortKeyName="status" className="w-[100px]" />
            <SortableHead label="Kursname" sortKeyName="name" />
            <SortableHead label="Online" sortKeyName="online" className="w-[100px]" />
            <SortableHead label="Praxis" sortKeyName="praxis" className="w-[100px]" />
            <SortableHead label="Kombi" sortKeyName="kombi" className="w-[100px]" />
            <TableHead className="w-[80px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedOfferings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Noch keine Kursangebote erstellt.
              </TableCell>
            </TableRow>
          ) : (
            sortedOfferings.map((o) => (
              <TableRow key={o.id}>
                {/* Status */}
                <TableCell>
                  <select
                    value={o.status === "live" ? "live" : "draft"}
                    onChange={() => toggleStatus(o)}
                    className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer ${
                      o.status === "live"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <option value="live">Live</option>
                    <option value="draft">Entwurf</option>
                  </select>
                </TableCell>

                {/* Name */}
                <TableCell className="font-medium">
                  {o.course_label_de || o.title}
                </TableCell>

                {/* Prices */}
                <TableCell className="text-sm text-muted-foreground">
                  {formatPrice(o.price_gross_online)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatPrice(o.price_gross_praxis)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatPrice(o.price_gross_kombi)}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(o)}
                      className="p-1.5 rounded hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
                      title="Bearbeiten"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(o.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Kursangebot löschen"
        description="Möchtest Du dieses Kursangebot wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Create / Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Kursangebot bearbeiten" : "Neues Kursangebot"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Course Key (URL-Slug)</Label>
                <Input value={form.course_key} onChange={(e) => updateField("course_key", e.target.value)} placeholder="grundkurs_botulinum" />
              </div>
              <div className="space-y-1.5">
                <Label>Kursname (DE)</Label>
                <Input value={form.course_label_de} onChange={(e) => updateField("course_label_de", e.target.value)} placeholder="Grundkurs Botulinum" />
              </div>
            </div>

            {/* Per-type names */}
            <div>
              <h3 className="font-semibold mb-2">Anzeigenamen</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Onlinekurs</Label>
                  <Input value={form.name_online} onChange={(e) => updateField("name_online", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Praxiskurs</Label>
                  <Input value={form.name_praxis} onChange={(e) => updateField("name_praxis", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Kombikurs</Label>
                  <Input value={form.name_kombi} onChange={(e) => updateField("name_kombi", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Prices */}
            <div>
              <h3 className="font-semibold mb-2">Preise (brutto, EUR)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Online</Label>
                  <Input type="number" step="0.01" value={form.price_gross_online} onChange={(e) => updateField("price_gross_online", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Praxis</Label>
                  <Input type="number" step="0.01" value={form.price_gross_praxis} onChange={(e) => updateField("price_gross_praxis", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Kombi</Label>
                  <Input type="number" step="0.01" value={form.price_gross_kombi} onChange={(e) => updateField("price_gross_kombi", e.target.value)} />
                </div>
              </div>
            </div>

            {/* LearnWorlds */}
            <div className="space-y-1.5">
              <Label>LearnWorlds Online Course ID (optional)</Label>
              <Input value={form.online_course_id} onChange={(e) => updateField("online_course_id", e.target.value)} placeholder="grundkurs-botulinum-online" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={!form.course_key}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
