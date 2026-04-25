"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertDialog } from "@/components/confirm-dialog";

interface Props {
  templates: { slug: string; label: string; requiresVnr: boolean }[];
}

export function CertificateTestForm({ templates }: Props) {
  const [templateSlug, setTemplateSlug] = useState(
    templates[0]?.slug || "",
  );
  const [name, setName] = useState("Dr. Marc Wyss");
  const [email, setEmail] = useState("wyss.a.marc@gmail.com");
  const [vnrTheorie, setVnrTheorie] = useState("2761102025010470002");
  const [vnrPraxis, setVnrPraxis] = useState("2761102025043200004");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const selectedTemplate = templates.find((t) => t.slug === templateSlug);
  const requiresVnr = selectedTemplate?.requiresVnr ?? true;

  const canSubmit = !!(
    templateSlug.trim() &&
    name.trim() &&
    (!requiresVnr || (vnrTheorie.trim() && vnrPraxis.trim()))
  );

  const handlePreview = async () => {
    if (!canSubmit) return;
    // Opens the rendered PDF inline in a new tab for visual calibration.
    const res = await fetch("/api/test-certificate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        templateSlug,
        vnrTheorie: requiresVnr ? vnrTheorie : "",
        vnrPraxis: requiresVnr ? vnrPraxis : "",
        preview: true,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setResult({
        title: "Vorschau fehlgeschlagen",
        description: data.error || `HTTP ${res.status}`,
      });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    // Release the object URL a minute later — long enough for the new
    // tab to finish loading, short enough not to leak on long sessions.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleSend = async () => {
    if (!canSubmit || !email.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/test-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          templateSlug,
          vnrTheorie: requiresVnr ? vnrTheorie : "",
          vnrPraxis: requiresVnr ? vnrPraxis : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({
          title: "Versand fehlgeschlagen",
          description: data.error || `HTTP ${res.status}`,
        });
      } else {
        setResult({
          title: "Zertifikat versendet",
          description: `Das Zertifikat wurde an ${data.sentTo} verschickt.`,
        });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <form
        className="space-y-5 bg-white rounded-[10px] p-6 shadow-sm ring-1 ring-black/5"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="cert_template">Kursvorlage</Label>
          <Select value={templateSlug} onValueChange={(v) => setTemplateSlug(v ?? "")}>
            <SelectTrigger id="cert_template" className="h-10 w-full">
              <SelectValue placeholder="Vorlage wählen..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.slug} value={t.slug}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Die Vorlage wird aus{" "}
            <code className="text-[11px]">public/certificates/</code> geladen.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cert_name">
            Name (Titel + Vor- und Nachname)
          </Label>
          <Input
            id="cert_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Dr. Ignacio Moreno"
            required
          />
          <p className="text-xs text-muted-foreground">
            Wird automatisch verkleinert, falls der Name in der Standardgröße
            nicht auf eine Zeile passt.
          </p>
        </div>

        {requiresVnr ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cert_vnr_theorie">VNR Theorie</Label>
              <Input
                id="cert_vnr_theorie"
                value={vnrTheorie}
                onChange={(e) => setVnrTheorie(e.target.value)}
                placeholder="2761102025010470002"
                required
              />
              <p className="text-xs text-muted-foreground">
                Stabil pro Kurs und Jahr (Onlineanteil).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cert_vnr_praxis">VNR Praxis</Label>
              <Input
                id="cert_vnr_praxis"
                value={vnrPraxis}
                onChange={(e) => setVnrPraxis(e.target.value)}
                placeholder="2761102025043200004"
                required
              />
              <p className="text-xs text-muted-foreground">
                Ändert sich pro Kurstermin (Praxisanteil).
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-[10px] px-3 py-2">
            Diese Vorlage trägt keine CME-Punkte. VNR Theorie und VNR Praxis
            werden auf dem Zertifikat nicht ausgewiesen.
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="cert_email">E-Mail</Label>
          <Input
            id="cert_email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="wyss.a.marc@gmail.com"
          />
          <p className="text-xs text-muted-foreground">
            Empfänger für den Testversand. Wird ignoriert, wenn Du auf
            &quot;Vorschau&quot; klickst.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={!canSubmit || sending}
          >
            Vorschau (ohne Versand)
          </Button>
          <Button
            type="submit"
            disabled={!canSubmit || !email.trim() || sending}
          >
            {sending ? "Wird gesendet..." : "Per E-Mail senden"}
          </Button>
        </div>
      </form>

      <AlertDialog
        open={!!result}
        title={result?.title ?? ""}
        description={result?.description ?? ""}
        onClose={() => setResult(null)}
      />
    </>
  );
}
