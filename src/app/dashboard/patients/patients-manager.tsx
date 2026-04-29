"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { read, utils } from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { Patient, PatientStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableHeaderBar } from "@/components/table/table-header-bar";
import { SortableHead } from "@/components/table/sortable-head";
import { useTableSort } from "@/hooks/use-table-sort";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronRight, AlertTriangle, Ban, Upload, Trash2, Plus } from "lucide-react";
import { NewContactModal } from "@/components/new-contact-modal";

interface ImportRow {
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  patient_status: PatientStatus;
}

interface Props {
  initialPatients: Patient[];
}

const statusLabels: Record<PatientStatus, string> = {
  active: "Aktiv",
  warning: "Warnung",
  blacklist: "Blacklist",
  inactive: "Inaktiv",
};

const statusBadgeVariants: Record<PatientStatus, "outline" | "secondary" | "destructive"> = {
  active: "outline",
  warning: "secondary",
  blacklist: "destructive",
  inactive: "secondary",
};

const statusColors: Record<PatientStatus, string> = {
  active: "text-green-600",
  warning: "text-amber-600",
  blacklist: "",
  inactive: "text-gray-500",
};

const allStatuses: PatientStatus[] = ["active", "warning", "blacklist", "inactive"];

type SortKey = "last_name" | "first_name" | "email" | "city" | "status" | "created_at";

export function PatientsManager({ initialPatients }: Props) {
  const [patients, setPatients] = useState(initialPatients);
  const [searchQuery, setSearchQuery] = useState("");
  const { sortKey, sortDir, handleSort } = useTableSort<SortKey>("created_at", "desc");
  const [importRows, setImportRows] = useState<ImportRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    skipped: number;
    insertedEmails?: string[];
  } | null>(null);
  const [deletePatient, setDeletePatient] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleStatusChange = async (patientId: string, newStatus: PatientStatus) => {
    setStatusDropdownId(null);
    setPatients((prev) => prev.map((p) => p.id === patientId ? { ...p, patient_status: newStatus } : p));
    await supabase
      .from("patients")
      .update({ patient_status: newStatus })
      .eq("id", patientId);
  };

  const handleDeletePatient = async () => {
    if (!deletePatient) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/delete-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: deletePatient.id }),
      });
      if (res.ok) {
        setPatients((prev) => prev.filter((p) => p.id !== deletePatient.id));
      }
    } finally {
      setDeleting(false);
      setDeletePatient(null);
    }
  };

  function parseStatusValue(raw: string | null | undefined): PatientStatus {
    const val = (raw || "").toLowerCase().trim();
    if (val === "blacklist") return "blacklist";
    if (val === "warning") return "warning";
    if (val === "inactive") return "inactive";
    return "active";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: Record<string, string>[] = utils.sheet_to_json(ws, { defval: "" });

      const rows: ImportRow[] = json
        .map((row) => ({
          first_name: row["First Name"]?.trim() || null,
          last_name: row["Last Name"]?.trim() || null,
          email: row["Email"]?.trim() || "",
          phone: row["Phone Number"]?.trim() || null,
          patient_status: parseStatusValue(row["Status"]),
        }))
        .filter((r) => r.email.length > 0);

      setImportRows(rows);
      setImportResult(null);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  async function handleConfirmImport() {
    if (!importRows) return;
    setImporting(true);
    try {
      const res = await fetch("/api/import-patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importRows),
      });
      const result = await res.json();
      setImportResult(result);
      if (result.inserted > 0) router.refresh();
    } finally {
      setImporting(false);
    }
  }

  const filteredPatients = patients
    .filter((p) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const fullName = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
      return (
        fullName.includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q) ||
        (p.address_city || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let aVal: string, bVal: string;
      if (sortKey === "last_name") {
        aVal = (a.last_name || "").toLowerCase();
        bVal = (b.last_name || "").toLowerCase();
      } else if (sortKey === "first_name") {
        aVal = (a.first_name || "").toLowerCase();
        bVal = (b.first_name || "").toLowerCase();
      } else if (sortKey === "email") {
        aVal = a.email.toLowerCase();
        bVal = b.email.toLowerCase();
      } else if (sortKey === "city") {
        aVal = (a.address_city || "").toLowerCase();
        bVal = (b.address_city || "").toLowerCase();
      } else if (sortKey === "status") {
        aVal = a.patient_status;
        bVal = b.patient_status;
      } else {
        aVal = a.created_at;
        bVal = b.created_at;
      }
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />

      <TableHeaderBar
        title="Proband:innen"
        count={filteredPatients.length}
        countLabel="Proband:innen"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Name, E-Mail, Telefon oder Ort..."
        actions={
          <>
            <Button
              onClick={() => setNewContactOpen(true)}
              className="h-9 px-3.5 py-0 text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Neuer Kontakt
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-3.5 py-0 text-sm font-medium bg-white border-input/60"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Excel
            </Button>
          </>
        }
      />

      <NewContactModal
        open={newContactOpen}
        onOpenChange={setNewContactOpen}
        defaultType="proband"
      />

      {/* Import preview modal */}
      <Dialog open={!!importRows} onOpenChange={(open) => { if (!open) { setImportRows(null); setImportResult(null); } }}>
        <DialogContent size="wide">
          <DialogHeader>
            <DialogTitle>Proband:innen importieren</DialogTitle>
          </DialogHeader>
          {importResult ? (
            <div className="py-4 space-y-3 text-sm">
              <p className="text-emerald-700 font-semibold text-base">
                {importResult.inserted} Proband:innen erfolgreich importiert.
              </p>
              {importResult.skipped > 0 && (
                <p className="text-muted-foreground">
                  {importResult.skipped} bereits vorhanden (übersprungen).
                </p>
              )}
              {importResult.insertedEmails && importResult.insertedEmails.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // CSV: header row + one email per line. Wrap each address
                    // in quotes so addresses with rare punctuation (e.g. a +
                    // alias) survive Excel's auto-formatter without splitting.
                    const csv = ["email", ...importResult.insertedEmails!.map((e) => `"${e.replace(/"/g, '""')}"`)].join("\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const today = new Date().toISOString().slice(0, 10);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `EPHIA-neue-probandinnen-${today}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 60_000);
                  }}
                >
                  Neue E-Mail-Adressen als CSV herunterladen
                </Button>
              )}
            </div>
          ) : importRows && (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-base font-semibold">
                  {importRows.length} Einträge in der Datei gefunden
                </p>
                <p className="text-xs text-muted-foreground">
                  E-Mail-Adressen, die bereits existieren (auch als Alias auf
                  einem anderen Profil), werden automatisch übersprungen.
                </p>
              </div>
              <div className="rounded-[10px] border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">E-Mail</TableHead>
                      <TableHead className="font-semibold">Telefon</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importRows.slice(0, 5).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.email}</TableCell>
                        <TableCell className="text-muted-foreground">{r.phone || "—"}</TableCell>
                        <TableCell>{statusLabels[r.patient_status]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {importRows.length > 5 && (
                  <div className="px-4 py-2 text-xs text-muted-foreground bg-gray-50 border-t border-gray-200">
                    + {importRows.length - 5} weitere Einträge (nicht angezeigt)
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setImportRows(null); setImportResult(null); }}>
              {importResult ? "Schließen" : "Abbrechen"}
            </Button>
            {!importResult && (
              <Button onClick={handleConfirmImport} disabled={importing}>
                {importing ? "Importiere..." : `${importRows?.length} Proband:innen importieren`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletePatient} onOpenChange={(open) => { if (!open) setDeletePatient(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proband:in löschen</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Möchtest Du <strong>{deletePatient?.first_name} {deletePatient?.last_name}</strong> ({deletePatient?.email}) wirklich löschen? Alle zugehörigen Buchungen werden ebenfalls entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePatient(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDeletePatient} disabled={deleting}>
              {deleting ? "Wird gelöscht..." : "Endgültig löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div>
          {filteredPatients.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Keine Proband:innen gefunden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Vorname" sortKey="first_name" currentKey={sortKey} direction={sortDir} onSort={handleSort as (key: string) => void} />
                  <SortableHead label="Nachname" sortKey="last_name" currentKey={sortKey} direction={sortDir} onSort={handleSort as (key: string) => void} />
                  <SortableHead label="E-Mail" sortKey="email" currentKey={sortKey} direction={sortDir} onSort={handleSort as (key: string) => void} />
                  <TableHead>Telefon</TableHead>
                  <SortableHead label="Ort" sortKey="city" currentKey={sortKey} direction={sortDir} onSort={handleSort as (key: string) => void} />
                  <SortableHead label="Status" sortKey="status" currentKey={sortKey} direction={sortDir} onSort={handleSort as (key: string) => void} />
                  <SortableHead label="Erstellt am" sortKey="created_at" currentKey={sortKey} direction={sortDir} onSort={handleSort as (key: string) => void} />
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/patients/${patient.id}`)}
                  >
                    <TableCell className="font-medium">
                      {patient.first_name || "–"}
                    </TableCell>
                    <TableCell>
                      {patient.last_name || "–"}
                    </TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>{patient.phone || ""}</TableCell>
                    <TableCell>
                      {patient.address_city
                        ? `${patient.address_zip || ""} ${patient.address_city}`.trim()
                        : ""}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <Badge
                          variant={statusBadgeVariants[patient.patient_status]}
                          className={`cursor-pointer ${statusColors[patient.patient_status]}`}
                          onClick={() =>
                            setStatusDropdownId(statusDropdownId === patient.id ? null : patient.id)
                          }
                        >
                          {statusLabels[patient.patient_status]}
                        </Badge>
                        {statusDropdownId === patient.id && (
                          <div className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md py-1 min-w-[140px]">
                            {allStatuses.map((s) => (
                              <button
                                key={s}
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-muted text-left"
                                onClick={() => handleStatusChange(patient.id, s)}
                              >
                                {s === "warning" && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                                {s === "blacklist" && <Ban className="h-3 w-3 text-red-600" />}
                                {s === "inactive" && <Ban className="h-3 w-3 text-gray-500" />}
                                {statusLabels[s]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(patient.created_at), "dd.MM.yyyy", { locale: de })}
                    </TableCell>
                    <TableCell className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletePatient(patient)}
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </div>
    </div>
  );
}
