// Builds the Galderma export spreadsheet. One row per consenting
// participant, columns matching the agreed data scope (name, email,
// phone, postal address + the attended course).

import ExcelJS from "exceljs";

export interface GaldermaExportRow {
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  anschrift: string;
  kurs_titel: string;
  kurs_datum: string;
}

const GALDERMA_COLUMNS: Array<{ header: string; key: keyof GaldermaExportRow }> = [
  { header: "vorname", key: "vorname" },
  { header: "nachname", key: "nachname" },
  { header: "email", key: "email" },
  { header: "telefon", key: "telefon" },
  { header: "anschrift", key: "anschrift" },
  { header: "kurs_titel", key: "kurs_titel" },
  { header: "kurs_datum", key: "kurs_datum" },
];

// Returns the .xlsx as a base64 string, ready as a Resend attachment.
// Uses exceljs (maintained, write-only) instead of the vulnerable xlsx
// package. The output shape is unchanged: one "Teilnehmer" sheet with a
// header row followed by one row per participant.
export async function buildGaldermaXlsx(rows: GaldermaExportRow[]): Promise<string> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Teilnehmer");
  ws.columns = GALDERMA_COLUMNS;
  for (const row of rows) ws.addRow(row);
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer).toString("base64");
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
