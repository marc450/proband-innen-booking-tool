// Renders the signed Galderma consent into a one-page A4 PDF: the exact
// consent wording, the participant's details, the course, the handwritten
// signature captured on the tablet, and a timestamp + Kursbetreuung name.
// This PDF is the durable proof artifact, stored in the private
// `partner-consents` Storage bucket.
//
// Uses pdf-lib's built-in Helvetica (WinAnsi encoding covers German
// umlauts ä ö ü ß), so no font embedding is needed.

import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { CONSENT_TEXT, GALDERMA_ENTITY } from "@/lib/partner-galderma";

export interface ConsentPdfInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  courseTitle: string;
  courseDate: string; // human readable, e.g. "12. Juni 2026"
  betreuerName: string | null;
  signedAtBerlin: string; // human readable timestamp
  consentTextVersion: string;
  signaturePngBytes: Uint8Array | null;
}

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 56;
const BRAND_BLUE = rgb(0, 0.4, 1);
const TEXT = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.45, 0.45, 0.45);

// Greedy word-wrap against the actual glyph widths.
function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function buildConsentPdf(
  input: ConsentPdfInput,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([A4.width, A4.height]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const contentWidth = A4.width - MARGIN * 2;
  let y = A4.height - MARGIN;

  const drawLines = (
    text: string,
    size: number,
    f: PDFFont,
    color = TEXT,
    lineGap = 4,
  ) => {
    for (const line of wrapText(text, f, size, contentWidth)) {
      page.drawText(line, { x: MARGIN, y, size, font: f, color });
      y -= size + lineGap;
    }
  };

  // Header
  page.drawText("Einwilligung in die Datenweitergabe", {
    x: MARGIN,
    y,
    size: 17,
    font: bold,
    color: BRAND_BLUE,
  });
  y -= 24;
  drawLines(
    `Empfänger: ${GALDERMA_ENTITY.name}, ${GALDERMA_ENTITY.address}`,
    10,
    font,
    MUTED,
  );
  y -= 14;

  // The verbatim consent wording the participant agreed to.
  drawLines(CONSENT_TEXT, 11, font, TEXT, 5);
  y -= 16;

  // Participant block
  page.drawText("Einwilligende Person", { x: MARGIN, y, size: 12, font: bold });
  y -= 18;
  const fields: Array<[string, string]> = [
    ["Name", `${input.firstName} ${input.lastName}`.trim() || "—"],
    ["E-Mail", input.email || "—"],
    ["Telefon", input.phone || "—"],
    ["Anschrift", input.address || "—"],
    ["Kurs", `${input.courseTitle} am ${input.courseDate}`],
  ];
  for (const [label, value] of fields) {
    page.drawText(`${label}:`, { x: MARGIN, y, size: 10, font: bold, color: TEXT });
    drawLines(value, 10, font, TEXT, 4);
    y -= 4;
  }
  y -= 14;

  // Signature
  page.drawText("Unterschrift", { x: MARGIN, y, size: 12, font: bold });
  y -= 8;
  if (input.signaturePngBytes) {
    try {
      const png = await doc.embedPng(input.signaturePngBytes);
      const maxW = 240;
      const scale = Math.min(maxW / png.width, 90 / png.height, 1);
      const w = png.width * scale;
      const h = png.height * scale;
      y -= h;
      page.drawImage(png, { x: MARGIN, y, width: w, height: h });
    } catch {
      // Corrupt/empty signature image: leave a ruled line instead of failing.
      y -= 40;
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: MARGIN + 240, y },
        thickness: 0.75,
        color: MUTED,
      });
    }
  }
  y -= 16;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + 240, y },
    thickness: 0.75,
    color: MUTED,
  });
  y -= 16;

  drawLines(
    `Unterschrieben am ${input.signedAtBerlin}` +
      (input.betreuerName
        ? ` gegenüber der Kursbetreuung ${input.betreuerName}.`
        : "."),
    10,
    font,
    MUTED,
    4,
  );
  y -= 6;
  drawLines(
    `Dokumentversion der Einwilligung: ${input.consentTextVersion}. ` +
      `Erfasst auf einem Tablet im Kurs durch die EPHIA Medical GmbH.`,
    8,
    font,
    MUTED,
    3,
  );

  return doc.save();
}
