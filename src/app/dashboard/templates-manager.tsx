"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CourseTemplate, Dozent } from "@/lib/types";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Plus, Trash2, Upload, ImageIcon } from "lucide-react";

interface Props {
  initialTemplates: CourseTemplate[];
  dozenten: Dozent[];
  onTemplatesChange?: (templates: CourseTemplate[]) => void;
}

function formatDozentName(d: Dozent): string {
  return [d.title, d.first_name, d.last_name].filter(Boolean).join(" ");
}

export function TemplatesManager({ initialTemplates, dozenten, onTemplatesChange }: Props) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CourseTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [guidePrice, setGuidePrice] = useState("");
  const [instructor, setInstructor] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const supabase = createClient();

  const updateTemplates = (newTemplates: CourseTemplate[]) => {
    setTemplates(newTemplates);
    onTemplatesChange?.(newTemplates);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setServiceDescription("");
    setGuidePrice("");
    setInstructor("");
    setImageUrl("");
    setImageUploadError(null);
    setEditing(null);
  };

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
      setImageUrl(urlData.publicUrl);
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

  const handleSave = async () => {
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      description: description || null,
      service_description: serviceDescription || null,
      guide_price: guidePrice || null,
      instructor: (instructor && instructor !== "__none") ? instructor : null,
      image_url: imageUrl || null,
    };

    setDialogOpen(false);
    resetForm();

    if (editing) {
      const { data, error } = await supabase
        .from("course_templates")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();

      if (error) {
        console.error("Template update error:", error);
        return;
      }

      if (data) {
        updateTemplates(templates.map((t) => (t.id === data.id ? data : t)));

        // Sync changes to all courses using this template
        await supabase
          .from("courses")
          .update({
            title: data.title,
            description: data.description,
            service_description: data.service_description,
            guide_price: data.guide_price,
            instructor: data.instructor,
            image_url: data.image_url,
          })
          .eq("template_id", data.id);
      }
    } else {
      const { data, error } = await supabase
        .from("course_templates")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Template insert error:", error);
        return;
      }

      if (data) {
        updateTemplates([data, ...templates]);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { error } = await supabase.from("course_templates").delete().eq("id", deleteConfirm);
    if (!error) {
      updateTemplates(templates.filter((t) => t.id !== deleteConfirm));
    }
    setDeleteConfirm(null);
  };

  const openEdit = (template: CourseTemplate) => {
    setEditing(template);
    setTitle(template.title);
    setDescription(template.description || "");
    setServiceDescription(template.service_description || "");
    setGuidePrice(template.guide_price || "");
    setInstructor(template.instructor || "");
    setImageUrl(template.image_url || "");
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Kursvorlage löschen"
        description="Vorlage wirklich löschen? Bereits erstellte Kurse bleiben erhalten."
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Kursvorlage bearbeiten" : "Neue Kursvorlage"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            {/* Grunddaten */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Grunddaten</h3>
              <div>
                <Label htmlFor="tpl_title">Titel *</Label>
                <Input
                  id="tpl_title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Grundkurs Botulinum"
                />
              </div>
              <div>
                <Label>Kursleitende:r Ärzt:in</Label>
                {dozenten.length > 0 ? (
                  <Select value={instructor} onValueChange={(v) => setInstructor(v || "")}>
                    <SelectTrigger className="mt-1">
                      <span className="flex flex-1 text-left line-clamp-1">
                        {instructor && instructor !== "__none"
                          ? instructor
                          : <span className="text-muted-foreground">Dozent:in auswählen...</span>
                        }
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Keine:r ausgewählt</SelectItem>
                      {dozenten.map((d) => (
                        <SelectItem key={d.id} value={formatDozentName(d)}>
                          {formatDozentName(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    Bitte erstelle zuerst Dozent:innen-Profile unter &quot;Dozent:innen&quot;.
                  </p>
                )}
              </div>
            </div>

            <div className="border-t" />

            {/* Leistung & Preis */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Leistung &amp; Preis</h3>
              <div>
                <Label htmlFor="tpl_service">Leistungsbeschreibung</Label>
                <Textarea
                  id="tpl_service"
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  placeholder="z.B. Behandlung mimischer Falten in bis zu 3 Zonen des Gesichts."
                />
              </div>
              <div>
                <Label htmlFor="tpl_price">Richtpreis</Label>
                <Input
                  id="tpl_price"
                  value={guidePrice}
                  onChange={(e) => setGuidePrice(e.target.value)}
                  placeholder="z.B. 99€"
                />
              </div>
            </div>

            <div className="border-t" />

            {/* Beschreibung & Bild */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Beschreibung &amp; Bild</h3>
              <div>
                <Label htmlFor="tpl_description">Kursbeschreibung</Label>
                <Textarea
                  id="tpl_description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Beschreibung, die Proband:innen auf der Buchungsseite sehen"
                  rows={4}
                />
              </div>
              <div>
                <Label>Kursbild</Label>
                {imageUrl ? (
                  <div className="mt-1 relative">
                    <img
                      src={imageUrl}
                      alt="Kursbild"
                      className="w-full aspect-video object-cover rounded-md border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setImageUrl("")}
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

            <Button onClick={handleSave} className="w-full" disabled={!title.trim()}>
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kursvorlagen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Definiere Kurstypen einmalig. Beim Erstellen eines neuen Kurses wählst Du einfach die Vorlage aus.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Neue Vorlage
        </Button>
      </div>

      {/* Template table */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Noch keine Kursvorlagen angelegt. Erstelle die erste Vorlage.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <th className="text-left px-4 py-3 w-12">Bild</th>
                  <th className="text-left px-4 py-3">Titel</th>
                  <th className="text-left px-4 py-3">Dozent:in</th>
                  <th className="text-left px-4 py-3">Leistung</th>
                  <th className="text-left px-4 py-3">Richtpreis</th>
                  <th className="text-right px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl) => (
                  <tr
                    key={tpl.id}
                    className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => openEdit(tpl)}
                  >
                    <td className="px-4 py-3">
                      {tpl.image_url ? (
                        <img
                          src={tpl.image_url}
                          alt={tpl.title}
                          className="w-12 h-8 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-8 bg-muted rounded flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground opacity-40" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{tpl.title}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {tpl.instructor || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                      {tpl.service_description || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {tpl.guide_price || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(tpl.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
