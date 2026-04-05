"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { read, utils } from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { Patient, PatientStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Search, ChevronRight, AlertTriangle, Ban, ArrowUpDown, ArrowUp, ArrowDown, Upload, Trash2 } from "lucide-react";

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
};

const statusBadgeVariants: Record<PatientStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "outline",
  warning: "secondary",
  blacklist: "destructive",
};

type SortKey = "name" | "email" | "city" | "status" | "created_at";
type SortDir = "asc" | "desc";

export function PatientsManager({ initialPatients }: Props) {
  const [patients, setPatients] = useState(initialPatients);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [importRows, setImportRows] = useState<ImportRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [deletePatient, setDeletePatient] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40 inline" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3 inline" />
      : <ArrowDown className="ml-1 h-3 w-3 inline" />;
  }

  const handleStatusChange = async (patientId: string, newStatus: PatientStatus) => {
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
      if (sortKey === "name") {
        aVal = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
        bVal = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase();
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
      <h1 className="text-2xl font-bold">Proband:innen</h1>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Name, E-Mail, Telefon oder Ort..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground ml-2">
          {filteredPatients.length} Proband:innen
        </span>
        <div className="ml-auto">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
        </div>
      </div>

      {/* Import preview modal */}
      <Dialog open={!!importRows} onOpenChange={(open) => { if (!open) { setImportRows(null); setImportResult(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Proband:innen importieren</DialogTitle>
          </DialogHeader>
          {importResult ? (
            <div className="py-4 space-y-2 text-sm">
              <p className="text-green-600 font-medium">{importResult.inserted} Proband:innen erfolgreich importiert.</p>
              {importResult.skipped > 0 && (
                <p className="text-muted-foreground">{importResult.skipped} bereits vorhanden (übersprungen).</p>
              )}
            </div>
          ) : importRows && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {importRows.length} Einträge gefunden. Vorschau (erste 5):
              </p>
              <div className="rounded border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importRows.slice(0, 5).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>{r.phone || "—"}</TableCell>
                        <TableCell>{statusLabels[r.patient_status]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {importRows.length > 5 && (
                <p className="text-xs text-muted-foreground">... und {importRows.length - 5} weitere</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportRows(null); setImportResult(null); }}>
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

      <Card>
        <CardContent className="p-0">
          {filteredPatients.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Keine Proband:innen gefunden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>Name<SortIcon col="name" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("email")}>E-Mail<SortIcon col="email" /></TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("city")}>Ort<SortIcon col="city" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>Status<SortIcon col="status" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("created_at")}>Erstellt am<SortIcon col="created_at" /></TableHead>
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
                      {patient.first_name || patient.last_name
                        ? `${patient.first_name || ""} ${patient.last_name || ""}`.trim()
                        : patient.email}
                    </TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>{patient.phone || ""}</TableCell>
                    <TableCell>
                      {patient.address_city
                        ? `${patient.address_zip || ""} ${patient.address_city}`.trim()
                        : ""}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={patient.patient_status}
                        onValueChange={(val) => handleStatusChange(patient.id, val as PatientStatus)}
                      >
                        <SelectTrigger className="w-[120px] h-8">
                          <span>{statusLabels[patient.patient_status]}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Aktiv</SelectItem>
                          <SelectItem value="warning">
                            <span className="flex items-center gap-1.5">
                              <AlertTriangle className="h-3 w-3 text-amber-600" />
                              Warnung
                            </span>
                          </SelectItem>
                          <SelectItem value="blacklist">
                            <span className="flex items-center gap-1.5">
                              <Ban className="h-3 w-3 text-red-600" />
                              Blacklist
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
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
        </CardContent>
      </Card>
    </div>
  );
}
