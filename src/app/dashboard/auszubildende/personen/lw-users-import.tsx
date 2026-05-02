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

// Client-side importer for the LearnWorlds "Export Users" XLSX. Owns
// its own file picker, parser, preview dialog, and API call. Replaces
// the earlier HubSpot Deals importer — LW is now the single source for
// legacy course enrollments, and the importer endpoint also runs a
// per-customer dedup that supersedes overlapping HubSpot rows.

interface LwUserRow {
  lw_user_id: string;
  username: string;
  email: string;
  signup: string | null;
  courses: string[];
  title: string | null;
  gender: string | null;
  birthdate: string | null;
  specialty: string | null;
  efn: string | null;
  address_line1: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  address_country: string | null;
}

interface ImportSummary {
  contacts_created: number;
  contacts_updated: number;
  bookings_inserted: number;
  bookings_skipped_duplicate: number;
  hubspot_rows_superseded: number;
  rows_invalid: number;
  rows_total: number;
}

// Case-insensitive header lookup. LW exports occasionally have
// trailing whitespace on column names, so we trim.
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

// LW exports look like "06 May 2024 13:11:42" or "16 May 1989" — both
// parseable by `new Date(string)` in modern JS engines. Empty strings
// and unparseable values return null so we skip the field rather than
// poison the record with NaN dates.
function toIsoTimestamp(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
function toIsoDate(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

const NULL_IF_BLANK = (v: string): string | null => {
  const t = v.trim();
  return t.length ? t : null;
};

interface Props {
  scope: "auszubildende" | "other";
}

export function LwUsersImportButton({ scope }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingRows, setPendingRows] = useState<LwUserRow[] | null>(null);
  const [pendingFilename, setPendingFilename] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  // Only on the Ärzt:innen tab — LW users are always Ärzt:innen.
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

        const rows: LwUserRow[] = [];
        for (const r of json) {
          const email = getCell(r, "email").toLowerCase();
          if (!email) continue; // skip empty rows + rows missing email
          const coursesRaw = getCell(r, "courses");
          const courses = coursesRaw
            ? coursesRaw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [];

          rows.push({
            lw_user_id: getCell(r, "id"),
            username: getCell(r, "username"),
            email,
            signup: toIsoTimestamp(getCell(r, "signup")),
            courses,
            title: NULL_IF_BLANK(
              getCell(r, "1) Welche Titel sollten wir für Dich verwenden?"),
            ),
            gender: NULL_IF_BLANK(getCell(r, "2) Was ist Dein Geschlecht?")),
            birthdate: toIsoDate(
              getCell(r, "3) Wie lautet Dein Geburtsdatum?"),
            ),
            specialty: NULL_IF_BLANK(
              getCell(r, "4) Was ist Deine Fachrichtung?"),
            ),
            // EFN field has a long question; match by prefix only.
            efn: NULL_IF_BLANK(
              (() => {
                for (const k of Object.keys(r)) {
                  if (k.trim().toLowerCase().startsWith("5) wie lautet deine efn")) {
                    return String(r[k] ?? "").trim();
                  }
                }
                return "";
              })(),
            ),
            address_line1: NULL_IF_BLANK(getCell(r, "bf_address")),
            address_postal_code: NULL_IF_BLANK(getCell(r, "bf_postalcode")),
            address_city: NULL_IF_BLANK(getCell(r, "bf_city")),
            address_country: NULL_IF_BLANK(getCell(r, "bf_country")),
          });
        }

        if (rows.length === 0) {
          setParseError(
            "Keine gültigen Zeilen gefunden. Erwartete Spalten: id, email, username, courses, …",
          );
          setPendingRows([]);
          return;
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
      const source = `lw_export_${today}`;
      const res = await fetch("/api/admin/import-lw-users", {
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
  const totalEnrollments = (pendingRows ?? []).reduce(
    (sum, r) => sum + r.courses.length,
    0,
  );

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
        LW Users
      </Button>

      <Dialog
        open={pendingRows !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>LearnWorlds Users importieren</DialogTitle>
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
                  <span className="font-medium">{pendingRows.length}</span> LW-Nutzer:innen
                </div>
                <div>
                  <span className="font-medium">{totalEnrollments}</span> Kurs-Enrollments
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Bestehende Kontakte mit passender E-Mail werden wiederverwendet (kein Duplikat).
                Leere Profilfelder (Titel, Fachrichtung, EFN, Adresse, Geburtsdatum) werden aus
                der LW-Datei ergänzt. HubSpot-Buchungen für Kontakte, die jetzt LW-Daten haben,
                werden automatisch durch die LW-Slugs ersetzt. Es werden keine E-Mails verschickt.
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
                  {result.hubspot_rows_superseded > 0 && (
                    <div>HubSpot-Buchungen ersetzt: <span className="font-semibold">{result.hubspot_rows_superseded}</span></div>
                  )}
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
