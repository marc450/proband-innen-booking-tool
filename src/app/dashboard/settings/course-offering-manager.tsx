"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Pencil, Trash2, Upload, ImageIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TableHeaderBar } from "@/components/table/table-header-bar";
import { SortableHead } from "@/components/table/sortable-head";
import { useTableSort } from "@/hooks/use-table-sort";
import type { CourseTemplate } from "@/lib/types";

interface Props {
  initialOfferings: CourseTemplate[];
}

type SortKey = "status" | "name" | "online" | "praxis" | "kombi";

function formatPrice(p: number | null | undefined) {
  if (!p) return "–";
  return `€${p.toLocaleString("de-DE")}`;
}

// Labels for the audience + level selects AND for the small indicators
// rendered in the Kursangebot table so both sides stay in sync.
const AUDIENCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "humanmediziner", label: "Humanmediziner:innen" },
  { value: "zahnmediziner", label: "Zahnmediziner:innen" },
  { value: "alle", label: "Alle" },
];

const LEVEL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "—" },
  { value: "einsteiger", label: "Einsteiger:innen" },
  { value: "fortgeschritten", label: "Fortgeschrittene" },
];

function audienceLabel(value: string | null | undefined): string {
  return AUDIENCE_OPTIONS.find((o) => o.value === value)?.label ?? "—";
}

function levelLabel(value: string | null | undefined): string {
  if (!value) return "";
  return LEVEL_OPTIONS.find((o) => o.value === value)?.label ?? "";
}

export function CourseOfferingManager({ initialOfferings }: Props) {
  const supabase = createClient();
  const [offerings, setOfferings] = useState(initialOfferings);
  const [editing, setEditing] = useState<CourseTemplate | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Sorting via shared hook
  const { sortKey, sortDir, handleSort } = useTableSort<SortKey>("name", "asc");

  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // Form fields
  const [form, setForm] = useState<Record<string, string>>({});

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: "",
      treatment_title: "",
      description: "",
      service_description: "",
      guide_price: "",
      image_url: "",
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
      audience: "humanmediziner",
      level: "",
      card_description: "",
    });
    setImageUploadError(null);
    setShowDialog(true);
  };

  const openEdit = (o: CourseTemplate) => {
    setEditing(o);
    setForm({
      title: o.title || "",
      treatment_title: o.treatment_title || "",
      description: o.description || "",
      service_description: o.service_description || "",
      guide_price: o.guide_price || "",
      image_url: o.image_url || "",
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
      audience: o.audience || "humanmediziner",
      level: o.level || "",
      card_description: o.card_description || "",
    });
    setImageUploadError(null);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;

    const payload = {
      title: form.title.trim(),
      treatment_title: form.treatment_title || null,
      description: form.description || null,
      service_description: form.service_description || null,
      guide_price: form.guide_price || null,
      image_url: form.image_url || null,
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
      audience: form.audience || null,
      level: form.level || null,
      card_description: form.card_description || null,
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

        // Sync Proband:innen fields to all courses using this template
        await supabase
          .from("courses")
          .update({
            title: data.title,
            treatment_title: data.treatment_title,
            description: data.description,
            service_description: data.service_description,
            guide_price: data.guide_price,
            image_url: data.image_url,
          })
          .eq("template_id", data.id);

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

    // Delete dependent records first (courses table has no ON DELETE CASCADE)
    // course_sessions cascade automatically, but course_bookings reference both
    // Delete course_bookings that reference this template
    await supabase.from("course_bookings").delete().eq("template_id", deleteId);
    // Delete courses (Proband:innen) that use this template
    // First delete bookings for slots in those courses
    const { data: courses } = await supabase.from("courses").select("id").eq("template_id", deleteId);
    if (courses && courses.length > 0) {
      const courseIds = courses.map((c: { id: string }) => c.id);
      const { data: slots } = await supabase.from("slots").select("id").in("course_id", courseIds);
      if (slots && slots.length > 0) {
        const slotIds = slots.map((s: { id: string }) => s.id);
        await supabase.from("bookings").delete().in("slot_id", slotIds);
        await supabase.from("slots").delete().in("course_id", courseIds);
      }
      await supabase.from("courses").delete().in("id", courseIds);
    }

    // Now delete the template (course_sessions cascade automatically)
    const { error } = await supabase.from("course_templates").delete().eq("id", deleteId);
    if (!error) {
      setOfferings((prev) => prev.filter((o) => o.id !== deleteId));
    }
    setDeleteId(null);
  };

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Image upload helpers
  const resizeImage = (file: File, maxWidth = 1200): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Blob failed"))),
          "image/webp",
          0.82
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (file: File) => {
    setUploadingImage(true);
    setImageUploadError(null);
    try {
      const resized = await resizeImage(file);
      const fileName = `template-${Date.now()}.webp`;
      const { error } = await supabase.storage
        .from("course-images")
        .upload(fileName, resized, { upsert: true, contentType: "image/webp" });
      if (error) {
        setImageUploadError(error.message || "Upload fehlgeschlagen");
        return;
      }
      const { data: urlData } = supabase.storage
        .from("course-images")
        .getPublicUrl(fileName);
      updateField("image_url", urlData.publicUrl);
    } catch {
      setImageUploadError("Upload fehlgeschlagen");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImage(file);
    e.target.value = "";
  };

  const handleImageDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await uploadImage(file);
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
          return (a.title || "").localeCompare(b.title || "") * dir;
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

  return (
    <div className="space-y-6">
      <TableHeaderBar
        title="Kursangebot"
        count={offerings.length}
        actions={<Button onClick={openCreate}>Neuer Kurs</Button>}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Bild</TableHead>
            <SortableHead label="Status" sortKey="status" currentKey={sortKey} direction={sortDir} onSort={handleSort} className="w-[100px]" />
            <SortableHead label="Kursname" sortKey="name" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
            <TableHead className="w-[200px]">Badges</TableHead>
            <SortableHead label="Online" sortKey="online" currentKey={sortKey} direction={sortDir} onSort={handleSort} className="w-[100px]" />
            <SortableHead label="Praxis" sortKey="praxis" currentKey={sortKey} direction={sortDir} onSort={handleSort} className="w-[100px]" />
            <SortableHead label="Kombi" sortKey="kombi" currentKey={sortKey} direction={sortDir} onSort={handleSort} className="w-[100px]" />
            <TableHead className="w-[80px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedOfferings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                Noch keine Kurse erstellt.
              </TableCell>
            </TableRow>
          ) : (
            sortedOfferings.map((o) => (
              <TableRow key={o.id} className="cursor-pointer" onClick={() => openEdit(o)}>
                {/* Image */}
                <TableCell>
                  {o.image_url ? (
                    <img
                      src={o.image_url}
                      alt={o.title}
                      className="w-12 h-8 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-8 bg-muted rounded flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground opacity-40" />
                    </div>
                  )}
                </TableCell>

                {/* Status — clickable Badge toggle */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Badge
                    className={`cursor-pointer select-none ${
                      o.status === "live"
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    onClick={() => toggleStatus(o)}
                  >
                    {o.status === "live" ? "Live" : "Entwurf"}
                  </Badge>
                </TableCell>

                {/* Name */}
                <TableCell className="font-medium">
                  {o.title}
                </TableCell>

                {/* Badges — audience + level indicators */}
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {o.audience && o.audience !== "alle" && (
                      <span
                        className={`text-[10px] font-semibold tracking-wide rounded-full px-2 py-0.5 ${
                          o.audience === "zahnmediziner"
                            ? "bg-[#BF785E]/15 text-[#8F4B30]"
                            : "bg-[#0066FF]/10 text-[#0055DD]"
                        }`}
                      >
                        {o.audience === "zahnmediziner" ? "Zahnmed." : "Humanmed."}
                      </span>
                    )}
                    {o.audience === "alle" && (
                      <span className="text-[10px] font-semibold tracking-wide rounded-full px-2 py-0.5 bg-black/5 text-black/60">
                        Alle
                      </span>
                    )}
                    {o.level && (
                      <span className="text-[10px] font-semibold tracking-wide rounded-full px-2 py-0.5 bg-black/5 text-black/60">
                        {o.level === "einsteiger" ? "Einsteiger:innen" : "Fortgeschrittene"}
                      </span>
                    )}
                  </div>
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
                <TableCell onClick={(e) => e.stopPropagation()}>
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
        title="Kurs löschen"
        description="Möchtest Du diesen Kurs wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Create / Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent size="wide" className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Kurs bearbeiten" : "Neuer Kurs"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">

            {/* ── Grunddaten ── */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Grunddaten</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Kursname *</Label>
                  <Input value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="z.B. Grundkurs Botulinum" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Course Key (URL-Slug)</Label>
                    <Input value={form.course_key} onChange={(e) => updateField("course_key", e.target.value)} placeholder="grundkurs_botulinum" />
                    <p className="text-[11px] text-muted-foreground">Nur nötig für Ärzt:innen-Buchungsseiten</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>LearnWorlds Course ID</Label>
                    <Input value={form.online_course_id} onChange={(e) => updateField("online_course_id", e.target.value)} placeholder="grundkurs-botulinum-online" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Zielgruppe</Label>
                    <Select
                      value={form.audience || "humanmediziner"}
                      onValueChange={(val) => updateField("audience", val ?? "humanmediziner")}
                    >
                      <SelectTrigger>
                        <span>{audienceLabel(form.audience)}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {AUDIENCE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">Steuert den &quot;Für …&quot;-Badge auf der Kurskachel</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Niveau</Label>
                    <Select
                      value={form.level || "__none__"}
                      onValueChange={(val) => updateField("level", !val || val === "__none__" ? "" : val)}
                    >
                      <SelectTrigger>
                        <span>{form.level ? levelLabel(form.level) : "—"}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        <SelectItem value="einsteiger">Einsteiger:innen</SelectItem>
                        <SelectItem value="fortgeschritten">Fortgeschrittene</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">Zweiter Badge neben der Zielgruppe (optional)</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Beschreibung (Kurskachel)</Label>
                  <Textarea
                    value={form.card_description}
                    onChange={(e) => updateField("card_description", e.target.value)}
                    placeholder="Kurzer Beschreibungstext, der auf der Kurskachel unter dem Titel erscheint (kurse.ephia.de)"
                    rows={4}
                  />
                  <p className="text-[11px] text-muted-foreground">Steuert den Text auf der Kurskachel unter Titel und Badges</p>
                </div>
              </div>
            </div>

            <div className="border-t" />

            {/* ── Proband:innen ── */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Proband:innen Buchungsseite</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Behandlungsname (öffentlich)</Label>
                  <Input value={form.treatment_title} onChange={(e) => updateField("treatment_title", e.target.value)} placeholder="z.B. Behandlung mimischer Falten mit Botulinum" />
                  <p className="text-[11px] text-muted-foreground">Wird Proband:innen statt des Kursnamens angezeigt</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Leistungsbeschreibung</Label>
                  <Textarea
                    value={form.service_description}
                    onChange={(e) => updateField("service_description", e.target.value)}
                    placeholder="z.B. Behandlung mimischer Falten in bis zu 3 Zonen des Gesichts."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Richtpreis</Label>
                  <Input value={form.guide_price} onChange={(e) => updateField("guide_price", e.target.value)} placeholder="z.B. 99€" />
                </div>
                <div className="space-y-1.5">
                  <Label>Kursbeschreibung</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Beschreibung, die Proband:innen auf der Buchungsseite sehen"
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Kursbild</Label>
                  {form.image_url ? (
                    <div className="mt-1 relative">
                      <img
                        src={form.image_url}
                        alt="Kursbild"
                        className="w-full aspect-video object-cover rounded-md border"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => updateField("image_url", "")}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Entfernen
                      </Button>
                    </div>
                  ) : (
                    <label
                      className={`mt-1 flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
                        isDraggingOver
                          ? "border-primary bg-primary/10"
                          : "hover:border-primary/50 hover:bg-muted/50"
                      }`}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }}
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); }}
                      onDrop={handleImageDrop}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                      {uploadingImage ? (
                        <div className="flex flex-col items-center gap-2">
                          <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-sm text-muted-foreground">Wird hochgeladen...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                          <span className="text-sm text-muted-foreground">Bild hochladen oder hierher ziehen</span>
                          <span className="text-xs text-muted-foreground">JPG, PNG, WebP</span>
                        </>
                      )}
                    </label>
                  )}
                  {imageUploadError && (
                    <p className="text-sm text-red-600 mt-1">{imageUploadError}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t" />

            {/* ── Auszubildende: Anzeigenamen ── */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ärzt:innen: Anzeigenamen</h3>
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

            <div className="border-t" />

            {/* ── Auszubildende: Preise ── */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ärzt:innen: Preise (brutto, EUR)</h3>
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

            <div className="border-t" />

            {/* ── Auszubildende: Beschreibungen (Stripe) ── */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ärzt:innen: Beschreibungen (Stripe)</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Onlinekurs</Label>
                  <Textarea
                    value={form.description_online}
                    onChange={(e) => updateField("description_online", e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Praxiskurs</Label>
                  <Textarea
                    value={form.description_praxis}
                    onChange={(e) => updateField("description_praxis", e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Kombikurs</Label>
                  <Textarea
                    value={form.description_kombi}
                    onChange={(e) => updateField("description_kombi", e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div className="border-t" />

            {/* ── URLs ── */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">URLs</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Success Online</Label>
                    <Input value={form.success_url_online} onChange={(e) => updateField("success_url_online", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Success Praxis</Label>
                    <Input value={form.success_url_praxis} onChange={(e) => updateField("success_url_praxis", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Success Kombi</Label>
                    <Input value={form.success_url_kombi} onChange={(e) => updateField("success_url_kombi", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Cancel Online</Label>
                    <Input value={form.cancel_url_online} onChange={(e) => updateField("cancel_url_online", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cancel Praxis</Label>
                    <Input value={form.cancel_url_praxis} onChange={(e) => updateField("cancel_url_praxis", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cancel Kombi</Label>
                    <Input value={form.cancel_url_kombi} onChange={(e) => updateField("cancel_url_kombi", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={!form.title?.trim()}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
