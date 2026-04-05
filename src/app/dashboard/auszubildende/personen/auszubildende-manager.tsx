"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { read, utils } from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Upload } from "lucide-react";
import type { Auszubildende } from "@/lib/types";

// Shape matches the server-side ImportRow in /api/import-auszubildende.
// All fields except email are optional; empty strings are allowed and
// get coerced to null server-side.
interface ImportRow {
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  email: string;
  phone: string | null;
  company_name: string | null;
  address_line1: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  address_country: string | null;
  efn: string | null;
  specialty: string | null;
  created_at: string | null;
}

type ImportResult = {
  inserted: number;
  skipped: number;
  invalid?: number;
  error?: string;
};

const typeLabel = (t: Auszubildende["contact_type"]): string => {
  switch (t) {
    case "company":
      return "Firma";
    case "proband":
      return "Proband:in";
    case "other":
      return "Sonstige";
    case "auszubildende":
    default:
      return "Auszubildende:r";
  }
};

interface Props {
  initialAuszubildende: Auszubildende[];
  bookingCounts: Record<string, number>;
  // Determines page title / count label. Actual row filtering by
  // contact_type happens server-side in page.tsx.
  scope?: "auszubildende" | "other";
}

export function AuszubildendeManager({
  initialAuszubildende,
  bookingCounts,
  scope = "auszubildende",
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows] = useState<ImportRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const pageTitle = scope === "other" ? "Sonstige Kontakte" : "Auszubildende";
  const countLabel =
    scope === "other"
      ? `${initialAuszubildende.length} Kontakte`
      : `${initialAuszubildende.length} Auszubildende`;

  // Parses the file (CSV or XLSX) with the xlsx lib — it auto-detects
  // format from the byte stream. Column names must match the server
  // ImportRow shape exactly; the HubSpot export cleanup script we use
  // already produces this header row.
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: Record<string, string>[] = utils.sheet_to_json(ws, {
        defval: "",
      });

      const str = (v: string | undefined) => {
        const s = (v ?? "").trim();
        return s.length ? s : null;
      };

      const parsed: ImportRow[] = json
        .map((row) => ({
          first_name: str(row["first_name"]),
          last_name: str(row["last_name"]),
          title: str(row["title"]),
          email: (row["email"] ?? "").trim().toLowerCase(),
          phone: str(row["phone"]),
          company_name: str(row["company_name"]),
          address_line1: str(row["address_line1"]),
          address_postal_code: str(row["address_postal_code"]),
          address_city: str(row["address_city"]),
          address_country: str(row["address_country"]),
          efn: str(row["efn"]),
          specialty: str(row["specialty"]),
          created_at: str(row["created_at"]),
        }))
        .filter((r) => r.email.length > 0);

      setImportRows(parsed);
      setImportResult(null);
    };
    reader.readAsArrayBuffer(file);
    // Reset so the same file can be selected again after the dialog closes.
    e.target.value = "";
  };

  const handleConfirmImport = async () => {
    if (!importRows) return;
    setImporting(true);
    try {
      const res = await fetch("/api/import-auszubildende", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importRows),
      });
      const result: ImportResult = await res.json();
      setImportResult(result);
      if (result.inserted > 0) router.refresh();
    } finally {
      setImporting(false);
    }
  };

  const filtered = initialAuszubildende.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.first_name?.toLowerCase().includes(s) ||
      a.last_name?.toLowerCase().includes(s) ||
      a.email?.toLowerCase().includes(s) ||
      a.phone?.toLowerCase().includes(s) ||
      a.company_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {search ? `${filtered.length} / ${countLabel}` : countLabel}
          </span>
          <Input
            placeholder="Name, E-Mail oder Telefon suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          {scope === "auszubildende" && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Import preview / result dialog. Skips any email that already
          exists in the auszubildende table — no overwrites, no merge. */}
      <Dialog
        open={!!importRows}
        onOpenChange={(open) => {
          if (!open) {
            setImportRows(null);
            setImportResult(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Auszubildende importieren</DialogTitle>
          </DialogHeader>

          {importResult ? (
            <div className="py-4 space-y-2 text-sm">
              {importResult.error ? (
                <p className="text-destructive font-medium">
                  Fehler: {importResult.error}
                </p>
              ) : (
                <>
                  <p className="text-green-600 font-medium">
                    {importResult.inserted} Auszubildende erfolgreich importiert.
                  </p>
                  {importResult.skipped > 0 && (
                    <p className="text-muted-foreground">
                      {importResult.skipped} bereits vorhanden (übersprungen).
                    </p>
                  )}
                  {importResult.invalid ? (
                    <p className="text-muted-foreground">
                      {importResult.invalid} ungültig (keine E-Mail).
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            importRows && (
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
                        <TableHead>Ort</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRows.slice(0, 5).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            {[r.title, r.first_name, r.last_name]
                              .filter(Boolean)
                              .join(" ") || "–"}
                          </TableCell>
                          <TableCell>{r.email}</TableCell>
                          <TableCell>{r.phone || "–"}</TableCell>
                          <TableCell>
                            {[r.address_postal_code, r.address_city]
                              .filter(Boolean)
                              .join(" ") || "–"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {importRows.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    ... und {importRows.length - 5} weitere
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Bestehende E-Mail-Adressen werden übersprungen (kein Überschreiben).
                </p>
              </div>
            )
          )}

          <DialogFooter>
            {importResult ? (
              <Button
                onClick={() => {
                  setImportRows(null);
                  setImportResult(null);
                }}
              >
                Schließen
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setImportRows(null)}
                  disabled={importing}
                >
                  Abbrechen
                </Button>
                <Button onClick={handleConfirmImport} disabled={importing}>
                  {importing ? "Wird importiert..." : "Importieren"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>E-Mail</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead className="text-center">Buchungen</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                {search ? "Keine Einträge gefunden." : "Noch keine Einträge vorhanden."}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((azubi) => {
              const personName = [azubi.first_name, azubi.last_name].filter(Boolean).join(" ");
              const isCompany = azubi.contact_type === "company";
              const displayName = isCompany
                ? azubi.company_name || personName || "–"
                : personName || azubi.company_name || "–";
              const count = bookingCounts[azubi.id] || 0;
              return (
                <TableRow key={azubi.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/dashboard/auszubildende/personen/${azubi.id}`)}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/auszubildende/personen/${azubi.id}`}
                      className="text-primary hover:underline"
                    >
                      {displayName}
                    </Link>
                    {!isCompany && azubi.company_name && (
                      <div className="text-xs text-muted-foreground">{azubi.company_name}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {typeLabel(azubi.contact_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>{azubi.email}</TableCell>
                  <TableCell>{azubi.phone || "–"}</TableCell>
                  <TableCell className="text-center">{count}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${
                      azubi.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {azubi.status === "active" ? "Aktiv" : "Inaktiv"}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
