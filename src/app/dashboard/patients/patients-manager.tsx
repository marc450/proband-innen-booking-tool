"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Patient, PatientStatus } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Search, ChevronRight, AlertTriangle, Ban, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

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
      </div>

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
                    <TableCell>
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
