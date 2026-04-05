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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Upload, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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

type SortKey = "name" | "email" | "bookings" | "status" | "created_at";
type SortDir = "asc" | "desc";

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
      return "Ärzt:in";
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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  // In the "other" scope we mix Firma + Sonstige contacts; a type filter
  // lets the user split them. In the auszubildende scope it's always
  // auszubildende so we hide the filter there.
  const [typeFilter, setTypeFilter] = useState<"all" | "company" | "other">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows] = useState<ImportRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40 inline" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  const pageTitle = scope === "other" ? "Sonstige Kontakte" : "Ärzt:innen";
  const countLabel =
    scope === "other"
      ? `${initialAuszubildende.length} Kontakte`
      : `${initialAuszubildende.length} Ärzt:innen`;

  // Parses the file with the xlsx lib, which handles CSV as well. For
  // .csv files we read as text first and pass type:"string" — reading
  // CSV from a Uint8Array silently produces zero rows on some encodings
  // (BOM, UTF-8 umlauts) so we avoid that path entirely. XLSX files
  // still go through the binary path. Any exception surfaces in the
  // dialog instead of vanishing into the console.
  const parseCsvText = (text: string): ImportRow[] => {
    // Strip UTF-8 BOM if present.
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const wb = read(text, { type: "string" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json: Record<string, string>[] = utils.sheet_to_json(ws, {
      defval: "",
    });
    return mapRows(json);
  };

  const parseXlsxBytes = (bytes: Uint8Array): ImportRow[] => {
    const wb = read(bytes, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json: Record<string, string>[] = utils.sheet_to_json(ws, {
      defval: "",
    });
    return mapRows(json);
  };

  const mapRows = (json: Record<string, string>[]): ImportRow[] => {
    const str = (v: string | undefined) => {
      const s = (v ?? "").toString().trim();
      return s.length ? s : null;
    };
    return json
      .map((row) => ({
        first_name: str(row["first_name"]),
        last_name: str(row["last_name"]),
        title: str(row["title"]),
        email: (row["email"] ?? "").toString().trim().toLowerCase(),
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
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isCsv =
      file.name.toLowerCase().endsWith(".csv") ||
      file.type === "text/csv" ||
      file.type === "application/csv";

    const reader = new FileReader();

    reader.onerror = () => {
      setImportResult({
        inserted: 0,
        skipped: 0,
        error: `Datei konnte nicht gelesen werden: ${reader.error?.message ?? "unbekannter Fehler"}`,
      });
      setImportRows([]);
    };

    reader.onload = (ev) => {
      try {
        let parsed: ImportRow[];
        if (isCsv) {
          const text = (ev.target?.result as string) ?? "";
          parsed = parseCsvText(text);
        } else {
          const bytes = new Uint8Array(ev.target?.result as ArrayBuffer);
          parsed = parseXlsxBytes(bytes);
        }
        if (parsed.length === 0) {
          setImportResult({
            inserted: 0,
            skipped: 0,
            error:
              "Keine Zeilen mit E-Mail gefunden. Prüfe die Spaltennamen (erwartet: first_name, last_name, email, ...).",
          });
          setImportRows([]);
          return;
        }
        setImportRows(parsed);
        setImportResult(null);
      } catch (err) {
        setImportResult({
          inserted: 0,
          skipped: 0,
          error: `Datei konnte nicht verarbeitet werden: ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
        setImportRows([]);
      }
    };

    if (isCsv) {
      reader.readAsText(file, "utf-8");
    } else {
      reader.readAsArrayBuffer(file);
    }
    // Reset so the same file can be picked again after closing the dialog.
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

  const filtered = initialAuszubildende
    .filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (scope === "other" && typeFilter !== "all" && a.contact_type !== typeFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        a.first_name?.toLowerCase().includes(s) ||
        a.last_name?.toLowerCase().includes(s) ||
        a.email?.toLowerCase().includes(s) ||
        a.phone?.toLowerCase().includes(s) ||
        a.company_name?.toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const nameOf = (x: Auszubildende) => {
        const person = [x.first_name, x.last_name].filter(Boolean).join(" ");
        return (x.contact_type === "company"
          ? x.company_name || person
          : person || x.company_name || ""
        ).toLowerCase();
      };
      switch (sortKey) {
        case "name":
          return nameOf(a).localeCompare(nameOf(b)) * dir;
        case "email":
          return (a.email || "").localeCompare(b.email || "") * dir;
        case "bookings":
          return ((bookingCounts[a.id] || 0) - (bookingCounts[b.id] || 0)) * dir;
        case "status":
          return (a.status || "").localeCompare(b.status || "") * dir;
        case "created_at":
          return (a.created_at || "").localeCompare(b.created_at || "") * dir;
      }
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
          {scope === "other" && (
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="company">Firma</SelectItem>
                <SelectItem value="other">Sonstige</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="inactive">Inaktiv</SelectItem>
            </SelectContent>
          </Select>
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
            <DialogTitle>Ärzt:innen importieren</DialogTitle>
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
                    {importResult.inserted} Ärzt:innen erfolgreich importiert.
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
            <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
              Name<SortIcon col="name" />
            </TableHead>
            <TableHead>Typ</TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => handleSort("email")}>
              E-Mail<SortIcon col="email" />
            </TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead
              className="text-center cursor-pointer select-none"
              onClick={() => handleSort("bookings")}
            >
              Buchungen<SortIcon col="bookings" />
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
              Status<SortIcon col="status" />
            </TableHead>
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
                <TableRow
                  key={azubi.id}
                  // Fixed height keeps every row identical whether or not a
                  // Firma sub-label is shown underneath the name.
                  className="h-16 cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/auszubildende/personen/${azubi.id}`)}
                >
                  <TableCell className="font-medium align-middle">
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
                  <TableCell className="align-middle">
                    <Badge variant="outline" className="text-xs">
                      {typeLabel(azubi.contact_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-middle">{azubi.email}</TableCell>
                  <TableCell className="align-middle">{azubi.phone || "–"}</TableCell>
                  <TableCell className="text-center align-middle">{count}</TableCell>
                  <TableCell className="align-middle">
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
