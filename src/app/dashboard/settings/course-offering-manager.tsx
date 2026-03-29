"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
import type { CourseTemplate } from "@/lib/types";

interface Props {
  initialOfferings: CourseTemplate[];
}

export function CourseOfferingManager({ initialOfferings }: Props) {
  const supabase = createClient();
  const [offerings, setOfferings] = useState(initialOfferings);
  const [editing, setEditing] = useState<CourseTemplate | null>(null);
  const [showDialog, setShowDialog] = useState(false);

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

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Kursangebote für Auszubildende (Ärzt:innen). Jedes Angebot kann einen Onlinekurs, Praxiskurs und Kombikurs enthalten.
        </p>
        <Button onClick={openCreate}>Neues Kursangebot</Button>
      </div>

      <div className="space-y-3">
        {offerings.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Noch keine Kursangebote erstellt.</p>
        ) : (
          offerings.map((o) => (
            <div key={o.id} className="bg-white rounded-lg border p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{o.course_label_de || o.title}</span>
                  <Badge variant="secondary" className="text-xs">{o.course_key}</Badge>
                  <button onClick={() => toggleStatus(o)}>
                    <Badge variant={o.status === "live" ? "default" : "secondary"}>
                      {o.status === "live" ? "Live" : "Entwurf"}
                    </Badge>
                  </button>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Online: {o.price_gross_online ? `€${o.price_gross_online}` : "–"} |{" "}
                  Praxis: {o.price_gross_praxis ? `€${o.price_gross_praxis}` : "–"} |{" "}
                  Kombi: {o.price_gross_kombi ? `€${o.price_gross_kombi}` : "–"}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => openEdit(o)}>
                Bearbeiten
              </Button>
            </div>
          ))
        )}
      </div>

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
