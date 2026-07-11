"use client";

// Tablet consent capture for the Galderma data forwarding. The
// Kursbetreuung opens this per participant at the end of a Praxis-/
// Kombikurs: it shows the verbatim consent wording, lets them confirm
// phone + postal address, and captures a handwritten signature on a
// canvas. On confirm it POSTs to /api/partner-consent/record, which
// renders + stores the signed PDF and emails the participant.

import { useEffect, useRef, useState } from "react";
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
import { Check, CheckCheck, Clock, Loader2, PenLine, RotateCcw } from "lucide-react";
import { CONSENT_TEXT, GALDERMA_ENTITY } from "@/lib/partner-galderma";

export interface ConsentState {
  consentedAt: string | null;
  revokedAt: string | null;
  // Stamped once the nightly cron has emailed this participant's data to
  // Galderma. Null while consent is captured but the export has not run
  // yet (normal in the hours between the course and the next morning).
  exportedAt?: string | null;
}

interface Props {
  bookingId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  prefillPhone: string | null;
  prefillAddress: string | null;
  courseTitle: string;
  courseDate: string;
  consent: ConsentState | null;
  onChanged?: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
}

export function PartnerConsentButton({
  bookingId,
  firstName,
  lastName,
  email,
  prefillPhone,
  prefillAddress,
  courseTitle,
  courseDate,
  consent,
  onChanged,
}: Props) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(prefillPhone ?? "");
  const [address, setAddress] = useState(prefillAddress ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  // Keep the dialog inside the visible area when the on-screen keyboard
  // opens. iOS shrinks the visual viewport but leaves a position:fixed
  // element sized to the full layout viewport, which pushes the footer
  // behind the keyboard. Track visualViewport and cap height + top.
  const [viewport, setViewport] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setViewport({ top: vv.offsetTop, height: vv.height });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setViewport(null);
    };
  }, [open]);

  const isActive = !!consent?.consentedAt && !consent?.revokedAt;
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "—";

  useEffect(() => {
    if (!open) return;
    setPhone(prefillPhone ?? "");
    setAddress(prefillAddress ?? "");
    setError(null);
    setInfo(null);
    hasInk.current = false;
    // Defer until the canvas is mounted + laid out.
    requestAnimationFrame(() => initCanvas());
  }, [open, prefillPhone, prefillAddress]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111111";
    ctx.clearRect(0, 0, rect.width, rect.height);
  };

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasInk.current = true;
  };

  const endStroke = () => {
    drawing.current = false;
  };

  const clearCanvas = () => {
    hasInk.current = false;
    initCanvas();
  };

  const submit = async () => {
    setError(null);
    if (!hasInk.current) {
      setError("Bitte unterschreibe im Feld.");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signaturePng = canvas.toDataURL("image/png");

    setSubmitting(true);
    try {
      const res = await fetch("/api/partner-consent/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          signaturePng,
          phone: phone.trim() || null,
          address: address.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Fehler (HTTP ${res.status}).`);
        return;
      }
      if (data.emailSent === false) {
        setInfo(
          "Einwilligung gespeichert. Die Bestätigungs-E-Mail konnte aber nicht versendet werden, bitte melde Dich beim Team.",
        );
        onChanged?.();
        return;
      }
      setOpen(false);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isActive) {
    const exportedAt = consent?.exportedAt ?? null;
    return (
      <span className="inline-flex flex-col gap-0.5">
        <span
          className="inline-flex items-center gap-1.5 text-sm text-emerald-700"
          title={`Eingewilligt am ${consent?.consentedAt ? formatDate(consent.consentedAt) : ""}`}
        >
          <Check className="h-4 w-4" />
          Eingewilligt
          {consent?.consentedAt ? ` am ${formatDate(consent.consentedAt)}` : ""}
        </span>
        {exportedAt ? (
          <span
            className="inline-flex items-center gap-1 text-xs text-emerald-700/80"
            title={`${fullName}: Daten am ${formatDate(exportedAt)} an Galderma gesendet`}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            An Galderma gesendet am {formatDate(exportedAt)}
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-xs text-amber-600"
            title={`${fullName}: Einwilligung erfasst, Versand an Galderma folgt beim nächsten Export`}
          >
            <Clock className="h-3.5 w-3.5" />
            Versand ausstehend
          </span>
        )}
      </span>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={!email}
        title={email ? "Galderma-Einwilligung am Tablet einholen" : "Keine E-Mail hinterlegt"}
      >
        <PenLine className="h-4 w-4 mr-1" />
        Einwilligung
      </Button>

      <Dialog open={open} onOpenChange={(o) => !submitting && setOpen(o)}>
        <DialogContent
          className="top-4 translate-y-0 flex max-h-[calc(100dvh-2rem)] flex-col bg-white sm:max-w-[640px]"
          initialFocus={scrollRef}
          style={
            viewport
              ? { top: viewport.top + 16, maxHeight: viewport.height - 32 }
              : undefined
          }
        >
          <DialogHeader>
            <DialogTitle>Einwilligung Datenweitergabe an Galderma</DialogTitle>
          </DialogHeader>

          <div
            ref={scrollRef}
            tabIndex={-1}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-1 outline-none"
          >
            <p className="text-sm text-muted-foreground">
              Bitte dem/der Teilnehmer:in <strong>{fullName}</strong> das Tablet
              reichen. Daten prüfen, dann unterschreiben lassen.
            </p>

            <div className="rounded-[10px] bg-muted/50 p-4 text-sm leading-relaxed text-foreground">
              {CONSENT_TEXT}
            </div>
            <p className="text-xs text-muted-foreground">
              Empfänger: {GALDERMA_ENTITY.name}, {GALDERMA_ENTITY.address}. Kurs:{" "}
              {courseTitle} am {courseDate}.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefonnummer" />
              </div>
              <div className="space-y-1.5">
                <Label>Anschrift</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Straße, PLZ Ort" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Unterschrift</Label>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Zurücksetzen
                </button>
              </div>
              <canvas
                ref={canvasRef}
                className="w-full h-40 rounded-[10px] bg-white ring-1 ring-black/10 touch-none cursor-crosshair"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endStroke}
                onPointerLeave={endStroke}
                onPointerCancel={endStroke}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-amber-700">{info}</p>}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Abbrechen
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Speichert…
                </>
              ) : (
                "Einwilligung speichern"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
