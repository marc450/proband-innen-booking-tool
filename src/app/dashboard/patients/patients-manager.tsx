"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import { ChevronRight, AlertTriangle, Ban, Trash2, Plus } from "lucide-react";
import { NewContactModal } from "@/components/new-contact-modal";

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
  const [deletePatient, setDeletePatient] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  // Inline error for status writes that the DB rejects (e.g. an old
  // CHECK constraint missing a new enum value). Surfaces in the row
  // so silent failures stop being silent.
  const [statusErrorByPatient, setStatusErrorByPatient] = useState<
    Record<string, string>
  >({});
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState<string | null>(null);
  const [prefillFirstName, setPrefillFirstName] = useState<string | null>(null);
  const [prefillLastName, setPrefillLastName] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Deep-link from the inbox sidebar: /…?newEmail=foo@bar.de auto-opens
  // the NewContactModal pre-filled, matching the auszubildende page.
  const searchParams = useSearchParams();
  const pathname = usePathname();
  useEffect(() => {
    const newEmail = searchParams?.get("newEmail");
    if (!newEmail) return;
    setPrefillEmail(newEmail);
    setPrefillFirstName(searchParams.get("newFirstName"));
    setPrefillLastName(searchParams.get("newLastName"));
    setNewContactOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("newEmail");
    next.delete("newFirstName");
    next.delete("newLastName");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [searchParams, pathname, router]);

  const handleStatusChange = async (patientId: string, newStatus: PatientStatus) => {
    setStatusDropdownId(null);
    setStatusErrorByPatient((prev) => {
      const next = { ...prev };
      delete next[patientId];
      return next;
    });
    // Capture the previous status so we can revert the optimistic UI
    // update when the DB rejects the new value.
    const prevStatus = patients.find((p) => p.id === patientId)?.patient_status;
    setPatients((prev) => prev.map((p) => p.id === patientId ? { ...p, patient_status: newStatus } : p));
    const { error } = await supabase
      .from("patients")
      .update({ patient_status: newStatus })
      .eq("id", patientId);
    if (error) {
      setPatients((prev) => prev.map((p) => p.id === patientId && prevStatus ? { ...p, patient_status: prevStatus } : p));
      setStatusErrorByPatient((prev) => ({ ...prev, [patientId]: error.message }));
    }
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
      <TableHeaderBar
        title="Proband:innen"
        count={filteredPatients.length}
        countLabel="Proband:innen"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Name, E-Mail, Telefon oder Ort..."
        actions={
          <Button
            onClick={() => setNewContactOpen(true)}
            className="h-9 px-3.5 py-0 text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Neuer Kontakt
          </Button>
        }
      />

      <NewContactModal
        open={newContactOpen}
        onOpenChange={(o) => {
          setNewContactOpen(o);
          if (!o) {
            setPrefillEmail(null);
            setPrefillFirstName(null);
            setPrefillLastName(null);
          }
        }}
        defaultType="proband"
        defaultEmail={prefillEmail}
        defaultFirstName={prefillFirstName}
        defaultLastName={prefillLastName}
      />

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
                        {statusErrorByPatient[patient.id] && (
                          <p className="mt-1 text-[11px] text-red-600 max-w-[200px]">
                            Status nicht gespeichert: {statusErrorByPatient[patient.id]}
                          </p>
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
