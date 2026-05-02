"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { read, utils } from "xlsx";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Client-side importer for the "All Deals" XLSX export from HubSpot.
// Self-contained — owns its file input, parsing logic, preview dialog,
// API call, and result display. Lives next to the existing CSV importer
// in auszubildende-manager.tsx and uses the same `xlsx` library.
//
// The HubSpot export columns we read:
//   - Deal Name       → product_name
//   - Amount          → amount (number)
//   - Course Date     → course_date (only set on Praxis/Kombi)
//   - Associated Contact → "Display Name (email@domain.com)" → split
//   - Close Date      → purchased_at (preferred)
//   - Create Date     → purchased_at fallback if Close Date missing
//
// All other columns (Deal Stage, …) are ignored. Rows without a
// parseable email are silently skipped per the product decision.

interface DealRow {
  contact_display: string;
  email: string;
  product_name: string;
  amount: number | null;
  course_date: string | null;
  purchased_at: string | null;
}

interface ImportSummary {
  contacts_created: number;
  contacts_updated: number;
  bookings_inserted: number;
  bookings_skipped_duplicate: number;
  rows_invalid: number;
  rows_total: number;
}

// Case-insensitive lookup of a column value in a row keyed by the
// HubSpot header. Trims whitespace.
function getCell(
  row: Record<string, unknown>,
  ...candidates: string[]
): string {
  for (const k of Object.keys(row)) {
    if (candidates.some((c) => c.toLowerCase() === k.toLowerCase().trim())) {
      const v = row[k];
      if (v == null) return "";
      if (typeof v === "string") return v.trim();
      if (v instanceof Date) return v.toISOString();
      return String(v);
    }
  }
  return "";
}

// "Dr. Antje Bodamer (a.bodamer@gmx.de)" → { display, email }
// Returns null when the cell doesn't have an email in parens.
function parseContactCell(
  cell: string,
): { display: string; email: string } | null {
  const m = cell.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!m) return null;
  const email = m[2].trim().toLowerCase();
  // Sanity: must look like an email.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return { display: m[1].trim(), email };
}

// XLSX with cellDates:true returns Date objects. Convert to "YYYY-MM-DD"
// for course_date (date-only) and ISO string for purchased_at (timestamp).
function toIsoDate(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
function toIsoTimestamp(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseAmount(v: string): number | null {
  if (!v) return null;
  // HubSpot amounts come through as numbers from xlsx (cellText:false),
  // already in EUR. Defensive: strip non-numeric chars before parseFloat
  // in case the cell happens to be a string with a currency symbol.
  const cleaned = String(v).replace(/[^\d.,-]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

interface Props {
  scope: "auszubildende" | "other";
}

export function HubSpotDealsImportButton({ scope }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingRows, setPendingRows] = useState<DealRow[] | null>(null);
  const [pendingFilename, setPendingFilename] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  // Only show this button on the auszubildende tab — HubSpot deals are
  // always Ärzt:innen contacts, never miscellaneous "other" contacts.
  if (scope !== "auszubildende") return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setResult(null);
    setResultError(null);
    setPendingFilename(file.name);

    const reader = new FileReader();
    reader.onerror = () => {
      setParseError(
        `Datei konnte nicht gelesen werden: ${reader.error?.message ?? "unbekannter Fehler"}`,
      );
      setPendingRows([]);
    };
    reader.onload = (ev) => {
      try {
        const bytes = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = read(bytes, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
          raw: true,
        });

        let skippedNoEmail = 0;
        const rows: DealRow[] = [];
        for (const r of json) {
          const dealName = getCell(r, "Deal Name");
          if (!dealName) continue; // empty row
          const contactCell = getCell(r, "Associated Contact");
          const parsed = parseContactCell(contactCell);
          if (!parsed) {
            skippedNoEmail++;
            continue;
          }
          const closeDate = getCell(r, "Close Date");
          const createDate = getCell(r, "Create Date");
          const purchasedAt =
            toIsoTimestamp(closeDate) ?? toIsoTimestamp(createDate);
          rows.push({
            contact_display: parsed.display,
            email: parsed.email,
            product_name: dealName,
            amount: parseAmount(getCell(r, "Amount")),
            course_date: toIsoDate(getCell(r, "Course Date")),
            purchased_at: purchasedAt,
          });
        }

        if (rows.length === 0) {
          setParseError(
            "Keine gültigen Zeilen gefunden. Erwartete Spalten: Deal Name, Associated Contact, Amount, Close Date.",
          );
          setPendingRows([]);
          return;
        }
        if (skippedNoEmail > 0) {
          // Don't block; just inform via the summary.
        }
        setPendingRows(rows);
      } catch (err) {
        setParseError(
          `Datei konnte nicht verarbeitet werden: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        setPendingRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const closeDialog = () => {
    setPendingRows(null);
    setPendingFilename("");
    setParseError(null);
    setResult(null);
    setResultError(null);
  };

  const handleConfirm = async () => {
    if (!pendingRows) return;
    setImporting(true);
    setResultError(null);
    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "_");
      const source = `hubspot_deals_${today}`;
      const res = await fetch("/api/admin/import-hubspot-deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, rows: pendingRows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResultError(data.error || `HTTP ${res.status}`);
        return;
      }
      setResult(data.summary as ImportSummary);
      router.refresh();
    } catch (err) {
      setResultError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  };

  // Counts for the preview screen.
  const uniqueEmails = new Set(pendingRows?.map((r) => r.email) ?? []);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="h-9 px-3.5 py-0 text-sm font-medium bg-white border-input/60"
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        HubSpot Deals
      </Button>

      <Dialog
        open={pendingRows !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>HubSpot Deals importieren</DialogTitle>
          </DialogHeader>

          {parseError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {parseError}
            </div>
          )}

          {!parseError && pendingRows && !result && (
            <div className="space-y-3 py-2 text-sm">
              <p className="text-muted-foreground">
                Datei: <span className="font-medium text-black">{pendingFilename}</span>
              </p>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-1">
                <div>
                  <span className="font-medium">{pendingRows.length}</span> Deals erkannt
                </div>
                <div>
                  <span className="font-medium">{uniqueEmails.size}</span> eindeutige Kontakte
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Beim Importieren werden bestehende Kontakte mit passender E-Mail
                wiederverwendet (kein Duplikat). Fehlende Vornamen, Nachnamen oder Titel
                werden aus der Datei ergänzt. Es werden keine E-Mails verschickt.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-3 py-2 text-sm">
              <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
                <div className="font-bold text-emerald-800 mb-2">Import erfolgreich</div>
                <div className="space-y-1 text-emerald-900">
                  <div>Neue Kontakte: <span className="font-semibold">{result.contacts_created}</span></div>
                  <div>Aktualisierte Kontakte (Felder ergänzt): <span className="font-semibold">{result.contacts_updated}</span></div>
                  <div>Neue Buchungen: <span className="font-semibold">{result.bookings_inserted}</span></div>
                  <div>Übersprungen (Duplikate): <span className="font-semibold">{result.bookings_skipped_duplicate}</span></div>
                  {result.rows_invalid > 0 && (
                    <div>Übersprungen (keine E-Mail): <span className="font-semibold">{result.rows_invalid}</span></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {resultError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {resultError}
            </div>
          )}

          <DialogFooter>
            {!result && !parseError && pendingRows && (
              <>
                <Button variant="outline" onClick={closeDialog} disabled={importing}>
                  Abbrechen
                </Button>
                <Button onClick={handleConfirm} disabled={importing || pendingRows.length === 0}>
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importieren...
                    </>
                  ) : (
                    "Importieren"
                  )}
                </Button>
              </>
            )}
            {(result || parseError) && (
              <Button onClick={closeDialog}>Schließen</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
