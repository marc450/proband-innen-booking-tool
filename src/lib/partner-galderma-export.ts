// Builds the Galderma export spreadsheet. One row per consenting
// participant, columns matching the agreed data scope (name, email,
// phone, postal address + the attended course).

import * as XLSX from "xlsx";

export interface GaldermaExportRow {
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  anschrift: string;
  kurs_titel: string;
  kurs_datum: string;
}

// Returns the .xlsx as a base64 string, ready as a Resend attachment.
export function buildGaldermaXlsx(rows: GaldermaExportRow[]): string {
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: [
      "vorname",
      "nachname",
      "email",
      "telefon",
      "anschrift",
      "kurs_titel",
      "kurs_datum",
    ],
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Teilnehmer");
  return XLSX.write(wb, { type: "base64", bookType: "xlsx" }) as string;
}

// Filename like ephia-galderma-export-2026-06-20-grundkurs-botulinum.xlsx
export function galdermaExportFilename(dateIso: string, courseTitle: string): string {
  const slug = courseTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "kurs";
  return `ephia-galderma-export-${dateIso}-${slug}.xlsx`;
}
