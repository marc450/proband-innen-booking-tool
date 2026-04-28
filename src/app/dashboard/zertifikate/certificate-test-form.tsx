"use client";

import { useEffect, useMemo, useState } from "react";
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

interface Variant {
  slug: string;
  label: string;
  requiresVnr: boolean;
}

export interface EligibleSession {
  id: string;
  dateIso: string;
  labelDe: string;
  courseLabel: string;
  vnrTheorie: string;
  vnrPraxis: string;
  variants: { humanmedizin?: Variant; zahnmedizin?: Variant };
}

type Audience = "humanmedizin" | "zahnmedizin";

interface Props {
  sessions: EligibleSession[];
}

const MONTHS_DE_SHORT = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];

function formatSessionLabel(s: EligibleSession): string {
  const [y, m, d] = s.dateIso.split("-").map(Number);
  if (!y || !m || !d) return s.labelDe;
  return `${s.labelDe} (${String(d).padStart(2, "0")}. ${MONTHS_DE_SHORT[m - 1]} ${y})`;
}

export function CertificateTestForm({ sessions }: Props) {
  const [sessionId, setSessionId] = useState(sessions[0]?.id || "");
  const session = useMemo(
    () => sessions.find((s) => s.id === sessionId),
    [sessions, sessionId],
  );

  // Which audience variants exist for the selected session. Drives the
  // toggle visibility — if a session only registers a Humanmedizin
  // cert, we hide the toggle entirely instead of offering a disabled
  // dentist choice.
  const availableAudiences: Audience[] = useMemo(() => {
    if (!session) return [];
    const out: Audience[] = [];
    if (session.variants.humanmedizin) out.push("humanmedizin");
    if (session.variants.zahnmedizin) out.push("zahnmedizin");
    return out;
  }, [session]);

  const [audience, setAudience] = useState<Audience>(
    availableAudiences[0] || "humanmedizin",
  );

  // Snap audience back to whatever's available when the session
  // changes. Without this, switching from a Botulinum session (both
  // variants) to a hypothetical Humanmedizin-only session while
  // "zahnmedizin" was selected would leave variant=undefined and
  // disable the buttons silently.
  useEffect(() => {
    if (availableAudiences.length === 0) return;
    if (!availableAudiences.includes(audience)) {
      setAudience(availableAudiences[0]);
    }
  }, [availableAudiences, audience]);

  const variant: Variant | undefined = session?.variants[audience];

  const [name, setName] = useState("Dr. Marc Wyss");
  const [email, setEmail] = useState("wyss.a.marc@gmail.com");
  const [vnrTheorie, setVnrTheorie] = useState(session?.vnrTheorie || "");
  const [vnrPraxis, setVnrPraxis] = useState(session?.vnrPraxis || "");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    title: string;
    description: string;
  } | null>(null);

  // Whenever the selected session changes, refresh the VNR fields to
  // that session's defaults. Editing them is still allowed (rare but
  // useful for one-offs), the auto-fill just guarantees the staff
  // member starts from the right baseline instead of inheriting values
  // from a previous session.
  useEffect(() => {
    if (!session) return;
    setVnrTheorie(session.vnrTheorie);
    setVnrPraxis(session.vnrPraxis);
  }, [session?.id, session?.vnrTheorie, session?.vnrPraxis, session]);

  const requiresVnr = variant?.requiresVnr ?? false;

  const canSubmit = !!(
    variant &&
    name.trim() &&
    (!requiresVnr || (vnrTheorie.trim() && vnrPraxis.trim()))
  );

  // Common bytes fetcher — both Vorschau and Herunterladen need the
  // rendered PDF blob, only the disposition differs after that.
  const fetchPdfBlob = async (): Promise<Blob | null> => {
    if (!variant) return null;
    const res = await fetch("/api/test-certificate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        templateSlug: variant.slug,
        vnrTheorie: requiresVnr ? vnrTheorie : "",
        vnrPraxis: requiresVnr ? vnrPraxis : "",
        preview: true,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setResult({
        title: "PDF konnte nicht erstellt werden",
        description: data.error || `HTTP ${res.status}`,
      });
      return null;
    }
    return await res.blob();
  };

  const handlePreview = async () => {
    if (!canSubmit) return;
    const blob = await fetchPdfBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleDownload = async () => {
    if (!canSubmit) return;
    const blob = await fetchPdfBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const safeName = name.trim().replace(/\s+/g, "-").replace(/[^A-Za-z0-9\-]/g, "") || "Teilnehmer";
    const safeTemplate = (variant?.label || "Zertifikat").replace(/\s+/g, "-");
    const a = document.createElement("a");
    a.href = url;
    a.download = `EPHIA-Zertifikat-${safeTemplate}-${safeName}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleSend = async () => {
    if (!canSubmit || !email.trim() || !variant) return;
    setSending(true);
    try {
      const res = await fetch("/api/test-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          templateSlug: variant.slug,
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

  const showAudienceToggle = availableAudiences.length > 1;

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
          <Label htmlFor="cert_session">Kurstermin</Label>
          <Select value={sessionId} onValueChange={(v) => setSessionId(v ?? "")}>
            <SelectTrigger id="cert_session" className="h-10 w-full">
              <SelectValue placeholder="Kurstermin wählen..." />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {formatSessionLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Liste enthält alle Kurstermine, deren Vorlage einen
            Zertifikatstyp registriert hat.
          </p>
        </div>

        {showAudienceToggle && (
          <div className="space-y-1.5">
            <Label>Zertifikatvariante</Label>
            <div className="inline-flex rounded-[10px] bg-muted p-1">
              <button
                type="button"
                onClick={() => setAudience("humanmedizin")}
                className={`px-4 py-1.5 text-sm rounded-[8px] transition-colors ${
                  audience === "humanmedizin"
                    ? "bg-white shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Humanmedizin
              </button>
              <button
                type="button"
                onClick={() => setAudience("zahnmedizin")}
                className={`px-4 py-1.5 text-sm rounded-[8px] transition-colors ${
                  audience === "zahnmedizin"
                    ? "bg-white shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Zahnmedizin
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {variant?.label}
            </p>
          </div>
        )}

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
                Aus der Kursvorlage geladen, überschreibbar.
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
                Aus dem Kurstermin geladen, überschreibbar.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-[10px] px-3 py-2">
            Diese Zertifikatsvariante trägt keine CME-Punkte. VNR Theorie
            und VNR Praxis werden auf dem Zertifikat nicht ausgewiesen.
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
            Empfänger:in für den Versand. Wird ignoriert, wenn Du auf
            &quot;Vorschau im Browser&quot; oder &quot;Als PDF
            herunterladen&quot; klickst.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownload}
            disabled={!canSubmit || sending}
          >
            Als PDF herunterladen
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={!canSubmit || sending}
          >
            Vorschau im Browser
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
