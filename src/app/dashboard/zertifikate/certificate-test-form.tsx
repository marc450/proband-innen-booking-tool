"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog } from "@/components/confirm-dialog";

interface SessionOption {
  id: string;
  dateIso: string;
  labelDe: string;
  courseLabel: string;
  vnrTheorie: string;
  vnrPraxis: string;
}

export interface CourseTypeOption {
  certSlug: string;
  certLabel: string;
  requiresVnr: boolean;
  sessions: SessionOption[];
}

interface Props {
  courseTypes: CourseTypeOption[];
}

const MONTHS_DE_SHORT = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];

function formatSessionLabel(s: SessionOption): string {
  const [y, m, d] = s.dateIso.split("-").map(Number);
  if (!y || !m || !d) return s.labelDe;
  return `${String(d).padStart(2, "0")}. ${MONTHS_DE_SHORT[m - 1]} ${y}`;
}

export function CertificateTestForm({ courseTypes }: Props) {
  // Two-step picker: course type drives which sessions appear, then a
  // session is chosen within that subset. The cert template is implicit
  // in the course type, so the audience toggle from the previous draft
  // is gone (the only registered cert variants today map 1:1 to
  // "Grundkurs Botulinum Humanmedizin" vs "Zahnmedizin", which is
  // exactly what the user picks at step 1).
  const [certSlug, setCertSlug] = useState(courseTypes[0]?.certSlug || "");
  const courseType = useMemo(
    () => courseTypes.find((c) => c.certSlug === certSlug),
    [courseTypes, certSlug],
  );

  const [sessionId, setSessionId] = useState(
    courseType?.sessions[0]?.id || "",
  );
  const session = useMemo(
    () => courseType?.sessions.find((s) => s.id === sessionId),
    [courseType, sessionId],
  );

  // When the course type changes, snap the session selection to the
  // first one in the new list. Without this, switching from Botulinum
  // Humanmedizin to Zahnmedizin would leave the previously-selected
  // session id in place; if it doesn't exist in the new list (it does
  // today since both share sessions, but won't always hold) the form
  // would silently invalidate.
  useEffect(() => {
    if (!courseType) return;
    if (!courseType.sessions.some((s) => s.id === sessionId)) {
      setSessionId(courseType.sessions[0]?.id || "");
    }
  }, [courseType, sessionId]);

  const [name, setName] = useState("Dr. Marc Wyss");
  const [result, setResult] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const requiresVnr = courseType?.requiresVnr ?? false;
  const vnrTheorie = session?.vnrTheorie || "";
  const vnrPraxis = session?.vnrPraxis || "";
  const vnrComplete = !requiresVnr || (!!vnrTheorie.trim() && !!vnrPraxis.trim());

  const canSubmit = !!(courseType && session && name.trim() && vnrComplete);

  // Common bytes fetcher — both Vorschau and Herunterladen need the
  // rendered PDF blob, only the disposition differs after that.
  const fetchPdfBlob = async (): Promise<Blob | null> => {
    if (!courseType || !session) return null;
    const res = await fetch("/api/test-certificate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        templateSlug: courseType.certSlug,
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
    const safeTemplate = (courseType?.certLabel || "Zertifikat").replace(/\s+/g, "-");
    const a = document.createElement("a");
    a.href = url;
    a.download = `EPHIA-Zertifikat-${safeTemplate}-${safeName}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <>
      <form
        className="space-y-5 bg-white rounded-[10px] p-6 shadow-sm ring-1 ring-black/5"
        onSubmit={(e) => {
          e.preventDefault();
          handleDownload();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="cert_type">Kurs</Label>
          <select
            id="cert_type"
            value={certSlug}
            onChange={(e) => setCertSlug(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-input bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {courseTypes.map((c) => (
              <option key={c.certSlug} value={c.certSlug}>
                {c.certLabel}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cert_session">Kurstermin</Label>
          <select
            id="cert_session"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-input bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={!courseType || courseType.sessions.length === 0}
          >
            {courseType?.sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {formatSessionLabel(s)}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            VNR Theorie und VNR Praxis werden automatisch aus dem
            ausgewählten Termin geladen.
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

        {requiresVnr && !vnrComplete && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-[10px] px-3 py-2">
            Für diesen Termin fehlt {!vnrTheorie.trim() && !vnrPraxis.trim()
              ? "VNR Theorie und VNR Praxis"
              : !vnrTheorie.trim()
              ? "VNR Theorie"
              : "VNR Praxis"}
            . Bitte zuerst unter Einstellungen → Kurstermine bzw. Kurse
            ergänzen, damit das Zertifikat erstellt werden kann.
          </p>
        )}

        {!requiresVnr && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-[10px] px-3 py-2">
            Diese Zertifikatsvariante trägt keine CME-Punkte. VNR Theorie
            und VNR Praxis werden auf dem Zertifikat nicht ausgewiesen.
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="submit"
            disabled={!canSubmit}
          >
            Als PDF herunterladen
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handlePreview}
            disabled={!canSubmit}
          >
            Vorschau im Browser
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
