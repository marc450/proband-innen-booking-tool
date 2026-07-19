"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ChevronDown, ChevronRight, Trash2, Users } from "lucide-react";
import { parseDateOnly } from "@/lib/date";

export interface TemplateOption {
  id: string;
  label: string;
}

export interface ProposalRow {
  id: string;
  status: "open" | "confirmed" | "cancelled";
  templateName: string;
  proposedDate: string;
  startTime: string | null;
  durationMinutes: number | null;
  maxSeats: number | null;
  address: string | null;
  notes: string | null;
  assignedName: string | null;
  createdSessionId: string | null;
  applications: Array<{
    id: string;
    profileId: string;
    name: string;
    status: string;
    note: string | null;
  }>;
}

const MONTHS_DE = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];

function formatDate(iso: string): string {
  const d = parseDateOnly(iso);
  return `${String(d.getDate()).padStart(2, "0")}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

const DEFAULT_ADDRESS = "HYSTUDIO, Rosa-Luxemburg-Straße 20, 10178 Berlin, Deutschland";

export function KursplanungManager({
  initialProposals,
  templates,
}: {
  initialProposals: ProposalRow[];
  templates: TemplateOption[];
}) {
  const router = useRouter();

  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    proposalId: string;
    applicationId: string;
    name: string;
  } | null>(null);

  // Create form
  const [fTemplate, setFTemplate] = useState("");
  const [fDate, setFDate] = useState("");
  const [fStart, setFStart] = useState("10:00");
  const [fDuration, setFDuration] = useState("360");
  const [fSeats, setFSeats] = useState("7");
  const [fAddress, setFAddress] = useState(DEFAULT_ADDRESS);
  const [fNotes, setFNotes] = useState("");

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetForm = () => {
    setFTemplate("");
    setFDate("");
    setFStart("10:00");
    setFDuration("360");
    setFSeats("7");
    setFAddress(DEFAULT_ADDRESS);
    setFNotes("");
  };

  const handleCreate = async () => {
    if (!fTemplate || !fDate) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/kursplanung/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: fTemplate,
          proposedDate: fDate,
          startTime: fStart,
          durationMinutes: parseInt(fDuration) || 360,
          maxSeats: parseInt(fSeats) || 5,
          address: fAddress,
          notes: fNotes,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error || `Anlegen fehlgeschlagen (HTTP ${res.status})`);
        return;
      }
      setShowCreate(false);
      resetForm();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingConfirm) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/kursplanung/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: pendingConfirm.proposalId,
          applicationId: pendingConfirm.applicationId,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error || `Bestätigen fehlgeschlagen (HTTP ${res.status})`);
        return;
      }
      if (json?.satellite && json.satellite.ok === false) {
        setError(
          `Termin angelegt, aber Proband:innen-Satellit konnte nicht erstellt werden: ${json.satellite.reason}. Bitte auf der Kurs-Detailseite manuell anlegen.`,
        );
      }
      setPendingConfirm(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/kursplanung/proposals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: deleteId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error || `Löschen fehlgeschlagen (HTTP ${res.status})`);
        return;
      }
      setDeleteId(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const statusBadge = (status: ProposalRow["status"]) => {
    const map: Record<ProposalRow["status"], { label: string; cls: string }> = {
      open: { label: "Offen", cls: "bg-[#0066FF]/10 text-[#0055DD]" },
      confirmed: { label: "Bestätigt", cls: "bg-emerald-100 text-emerald-700" },
      cancelled: { label: "Abgesagt", cls: "bg-gray-100 text-gray-600" },
    };
    const m = map[status];
    return (
      <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${m.cls}`}>
        {m.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setShowCreate(true)}>Neuen Termin vorschlagen</Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 flex items-start justify-between gap-4">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 font-medium shrink-0"
          >
            Schließen
          </button>
        </div>
      )}

      {initialProposals.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-sm text-muted-foreground">
          Noch keine Termine vorgeschlagen. Lege den ersten offenen Termin an.
        </div>
      ) : (
        <div className="space-y-2">
          {initialProposals.map((p) => {
            const isOpen = expanded.has(p.id);
            const activeApps = p.applications.filter(
              (a) => a.status === "applied" || a.status === "selected",
            );
            return (
              <div key={p.id} className="rounded-lg bg-white overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleExpand(p.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Bewerbungen anzeigen"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <div className="w-[90px] shrink-0">{statusBadge(p.status)}</div>
                  <div className="w-[130px] shrink-0 font-medium text-sm">
                    {formatDate(p.proposedDate)}
                  </div>
                  <div className="w-[70px] shrink-0 text-sm text-muted-foreground">
                    {p.startTime || "—"}
                  </div>
                  <div className="flex-1 text-sm truncate">{p.templateName}</div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                    <Users className="h-4 w-4" />
                    {activeApps.length}
                  </div>
                  {p.status === "confirmed" && p.assignedName && (
                    <div className="text-sm text-emerald-700 font-medium shrink-0 max-w-[180px] truncate">
                      {p.assignedName}
                    </div>
                  )}
                  <button
                    onClick={() => setDeleteId(p.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0"
                    title="Termin löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t bg-gray-50/60 px-4 py-3 space-y-3">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-muted-foreground">
                      <div>Dauer: {p.durationMinutes ? `${p.durationMinutes} Min` : "—"}</div>
                      <div>Max. Plätze: {p.maxSeats ?? "—"}</div>
                      <div className="col-span-2">Ort: {p.address || "—"}</div>
                      {p.notes && <div className="col-span-2">Notiz: {p.notes}</div>}
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Bewerbungen
                      </div>
                      {activeApps.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Noch keine Bewerbungen.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {activeApps.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center gap-3 bg-white rounded-md px-3 py-2"
                            >
                              <div className="flex-1 text-sm">
                                <span className="font-medium">{a.name}</span>
                                {a.status === "selected" && (
                                  <span className="ml-2 text-xs font-medium text-emerald-700">
                                    ausgewählt
                                  </span>
                                )}
                                {a.note && (
                                  <span className="ml-2 text-muted-foreground">
                                    „{a.note}“
                                  </span>
                                )}
                              </div>
                              {p.status === "open" && (
                                <Button
                                  size="sm"
                                  disabled={busy}
                                  onClick={() =>
                                    setPendingConfirm({
                                      proposalId: p.id,
                                      applicationId: a.id,
                                      name: a.name,
                                    })
                                  }
                                >
                                  Bestätigen
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Neuen Termin vorschlagen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Kurs</Label>
              <select
                value={fTemplate}
                onChange={(e) => setFTemplate(e.target.value)}
                className="h-10 w-full border border-input rounded-lg px-2.5 text-sm bg-transparent"
              >
                <option value="">Kurs wählen...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Datum</Label>
              <Input
                className="h-10"
                type="date"
                value={fDate}
                onChange={(e) => setFDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Startzeit</Label>
                <Input
                  className="h-10"
                  type="time"
                  value={fStart}
                  onChange={(e) => setFStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Dauer (Minuten)</Label>
                <Input
                  className="h-10"
                  type="number"
                  value={fDuration}
                  onChange={(e) => setFDuration(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Max. Plätze</Label>
              <Input
                className="h-10"
                type="number"
                value={fSeats}
                onChange={(e) => setFSeats(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Adresse</Label>
              <Input
                className="h-10"
                value={fAddress}
                onChange={(e) => setFAddress(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notiz (optional)</Label>
              <Textarea
                value={fNotes}
                onChange={(e) => setFNotes(e.target.value)}
                placeholder="Interne Notiz für die Dozent:innen, z.B. Besonderheiten des Termins"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={!fTemplate || !fDate || busy}>
              {busy ? "Anlegen..." : "Anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!pendingConfirm}
        title="Dozent:in bestätigen"
        description={
          pendingConfirm
            ? `${pendingConfirm.name} für diesen Termin bestätigen? Der Kurs wird als Termin angelegt (offline) und alle anderen Bewerbungen werden abgelehnt.`
            : ""
        }
        confirmLabel="Bestätigen"
        onConfirm={handleConfirm}
        onCancel={() => setPendingConfirm(null)}
      />

      {/* Delete dialog */}
      <ConfirmDialog
        open={!!deleteId}
        title="Termin löschen"
        description="Möchtest Du diesen vorgeschlagenen Termin wirklich löschen? Bereits erstellte Kurstermine bleiben erhalten."
        confirmLabel="Löschen"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
