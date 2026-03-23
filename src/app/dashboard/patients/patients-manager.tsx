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
import { Search, ChevronRight, AlertTriangle, Ban } from "lucide-react";

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

export function PatientsManager({ initialPatients }: Props) {
  const [patients, setPatients] = useState(initialPatients);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleStatusChange = async (patientId: string, newStatus: PatientStatus) => {
    setPatients((prev) => prev.map((p) => p.id === patientId ? { ...p, patient_status: newStatus } : p));
    await supabase
      .from("patients")
      .update({ patient_status: newStatus })
      .eq("id", patientId);
  };

  const filteredPatients = patients.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const fullName = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
    return (
      fullName.includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.phone || "").toLowerCase().includes(q) ||
      (p.address_city || "").toLowerCase().includes(q)
    );
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
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Ort</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erstellt am</TableHead>
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
                          <SelectValue />
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
