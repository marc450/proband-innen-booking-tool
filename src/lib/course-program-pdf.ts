import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { COURSE_KEYS_WITH_PROGRAM_PDF } from "./course-program-pdf-meta";

/**
 * Generates the one-page A4 "Programm" PDF that EPHIA submits to the
 * Landesärztekammer Berlin for every Praxiskurs. The Rahmenprogramm
 * (time-rows) is course-type specific. Currently only the Grundkurs
 * Botulinum template is registered; other Praxiskurse will be added
 * here as their schedules are confirmed.
 *
 * The Teilnehmendegebühr is intentionally hardcoded (the LÄK approval
 * is per course type, so the price is fixed for that type and must
 * match the approval). The Fortbildungsstätte comes from the session's
 * `address` so multi-location sessions show the correct venue.
 */

const BRAND_BLUE = rgb(0 / 255, 102 / 255, 255 / 255);
const TEXT_BLACK = rgb(0, 0, 0);
const TEXT_MUTED = rgb(0.35, 0.35, 0.35);

// A4 portrait in PDF user units (1pt = 1/72 inch).
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

const MARGIN_X = 60;
const HEADER_HEIGHT = 120;

interface ProgramRow {
  /** Minutes offset from the course start time. */
  offsetMin: number;
  label: string;
}

interface ProgramTemplate {
  /** Reference course start used when the offsets were authored. The
   *  actual session's start_time shifts every row by the delta. */
  referenceStartMinutes: number;
  rows: ProgramRow[];
  /** LÄK-approved Teilnehmendegebühr in EUR for this course type.
   *  Has to match the price that was registered with the Landes-
   *  ärztekammer Berlin when the course was accredited, so it is
   *  fixed per template and not pulled from the session. */
  teilnehmendegebuehrEur: number;
}

// Grundkurs Botulinum schedule, authored against a 10:00 start.
// Offsets: 0, +15m, +1h, +1h30, +3h15 (Pause), +3h45, +8h (Ende).
const BOTULINUM_GRUNDKURS: ProgramTemplate = {
  referenceStartMinutes: 10 * 60,
  teilnehmendegebuehrEur: 1040,
  rows: [
    { offsetMin: 0, label: "Begrüßung und Registrierung der Teilnehmenden" },
    { offsetMin: 15, label: "Wiederholungsfragen aus dem Onlineteil Grundkurs Botulinum" },
    { offsetMin: 60, label: "Aufklärung und Beratung von Patient:innen" },
    {
      offsetMin: 90,
      label:
        "Indikationsbesprechung und Behandlung von Patient:innen durch unsere Dozentin",
    },
    { offsetMin: 195, label: "Pause" },
    { offsetMin: 225, label: "Unterrichtung der Teilnehmenden an Patient:innen" },
    { offsetMin: 480, label: "Ende der Veranstaltung" },
  ],
};

// Grundkurs Dermalfiller — identical timing structure to the Botulinum
// Grundkurs (gleiche Tagesstruktur, gleiche LÄK-Akkreditierung mit
// 1040€), nur die Online-Wiederholungsfragen verweisen auf den Filler-
// Onlinekurs statt auf Botulinum.
const DERMALFILLER_GRUNDKURS: ProgramTemplate = {
  referenceStartMinutes: 10 * 60,
  teilnehmendegebuehrEur: 1040,
  rows: [
    { offsetMin: 0, label: "Begrüßung und Registrierung der Teilnehmenden" },
    { offsetMin: 15, label: "Wiederholungsfragen aus dem Onlineteil Grundkurs Dermalfiller" },
    { offsetMin: 60, label: "Aufklärung und Beratung von Patient:innen" },
    {
      offsetMin: 90,
      label:
        "Indikationsbesprechung und Behandlung von Patient:innen durch unsere Dozentin",
    },
    { offsetMin: 195, label: "Pause" },
    { offsetMin: 225, label: "Unterrichtung der Teilnehmenden an Patient:innen" },
    { offsetMin: 480, label: "Ende der Veranstaltung" },
  ],
};

// Aufbaukurs Botulinum: Therapeutische Indikationen — gleiche Tages-
// struktur wie die Grundkurse, aber andere LÄK-Akkreditierung mit 890€
// Teilnehmendegebühr. Der Wiederholungsfragen-Slot um 10:15 verweist
// auf den passenden Onlineteil "Aufbaukurs Botulinum therapeutische
// Indikationen" (Marc-bestätigt 2026-05-30, wich vom Quell-PDF ab).
const AUFBAUKURS_THERAPEUTISCHE_INDIKATIONEN_BOTULINUM: ProgramTemplate = {
  referenceStartMinutes: 10 * 60,
  teilnehmendegebuehrEur: 890,
  rows: [
    { offsetMin: 0, label: "Begrüßung und Registrierung der Teilnehmenden" },
    {
      offsetMin: 15,
      label:
        "Wiederholungsfragen aus dem Onlineteil Aufbaukurs Botulinum therapeutische Indikationen",
    },
    { offsetMin: 60, label: "Aufklärung und Beratung von Patient:innen" },
    {
      offsetMin: 90,
      label:
        "Indikationsbesprechung und Behandlung von Patient:innen durch unsere Dozentin",
    },
    { offsetMin: 195, label: "Pause" },
    { offsetMin: 225, label: "Unterrichtung der Teilnehmenden an Patient:innen" },
    { offsetMin: 480, label: "Ende der Veranstaltung" },
  ],
};

const PROGRAM_TEMPLATES: Record<string, ProgramTemplate> = {
  grundkurs_botulinum: BOTULINUM_GRUNDKURS,
  grundkurs_dermalfiller: DERMALFILLER_GRUNDKURS,
  aufbaukurs_therapeutische_indikationen_botulinum:
    AUFBAUKURS_THERAPEUTISCHE_INDIKATIONEN_BOTULINUM,
};

// Guard against the server registry and the client-side meta list
// drifting. Both must enumerate the same course_keys so the UI button
// is only shown when the API can actually generate a PDF.
for (const k of COURSE_KEYS_WITH_PROGRAM_PDF) {
  if (!(k in PROGRAM_TEMPLATES)) {
    throw new Error(
      `course-program-pdf: course_key "${k}" is listed in COURSE_KEYS_WITH_PROGRAM_PDF but has no PROGRAM_TEMPLATES entry`,
    );
  }
}
for (const k of Object.keys(PROGRAM_TEMPLATES)) {
  if (!COURSE_KEYS_WITH_PROGRAM_PDF.has(k)) {
    throw new Error(
      `course-program-pdf: course_key "${k}" has a PROGRAM_TEMPLATES entry but is missing from COURSE_KEYS_WITH_PROGRAM_PDF`,
    );
  }
}

export { hasProgramTemplate } from "./course-program-pdf-meta";

export interface CourseProgramInput {
  /** course_templates.course_key, e.g. "grundkurs_botulinum". */
  courseKey: string;
  /** Display title, e.g. "Grundkurs Botulinum". */
  title: string;
  /** Session date, ISO yyyy-MM-dd. */
  dateIso: string;
  /** Long description shown above the Rahmenprogramm. */
  description: string;
  /** Course start "HH:MM" (24h). */
  startTime: string;
  /** Composed Referent:in line ("Vorname Nachname, Fachgebiet, Arbeitgeber"). */
  instructorLine: string;
  /** Fortbildungsstätte address from course_sessions.address. */
  address: string | null;
}

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(total: number): string {
  const normalised = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalised / 60);
  const m = normalised % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDateDe(dateIso: string): string {
  const [y, m, d] = dateIso.split("-");
  return `${d}.${m}.${y}`;
}

/** Break a course title into up to two centred lines. If the title
 *  contains a colon (e.g. "Aufbaukurs Botulinum: Therapeutische
 *  Indikationen"), the part before the colon goes on line 1 in
 *  uppercase and the part after on line 2 in title case — matches the
 *  Aufbaukurs reference PDF Sophia uses. Otherwise the title is
 *  rendered as a single uppercase line, unless it overflows the
 *  available width, in which case word-wrap kicks in. */
function composeTitleLines(
  rawTitle: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const trimmed = rawTitle.trim();
  // Colon split: e.g. "Aufbaukurs Botulinum: Therapeutische Indikationen"
  // → ["AUFBAUKURS BOTULINUM", "Therapeutische Indikationen"]. Bewusst
  // nur dann zwei Zeilen, wenn ein Doppelpunkt da ist, damit
  // Grundkurs-Titel weiterhin als einzelne Zeile gerendert werden.
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx > 0 && colonIdx < trimmed.length - 1) {
    const head = trimmed.slice(0, colonIdx).trim().toUpperCase();
    const tail = trimmed.slice(colonIdx + 1).trim();
    return [head, tail];
  }
  // Single-line: try as-is in uppercase, fall back to word-wrap if too wide.
  const upper = trimmed.toUpperCase();
  if (font.widthOfTextAtSize(upper, size) <= maxWidth) {
    return [upper];
  }
  return wrapText(upper, font, size, maxWidth);
}

/** Word-wrap by measuring against the embedded font. Returns the lines
 *  in the order they should be drawn (top to bottom). */
function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const paragraphs = text.split(/\n+/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    lines.push("");
  }
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function drawHeaderBar(page: PDFPage, bold: PDFFont) {
  page.drawRectangle({
    x: 0,
    y: A4_HEIGHT - HEADER_HEIGHT,
    width: A4_WIDTH,
    height: HEADER_HEIGHT,
    color: BRAND_BLUE,
  });

  const brand = "EPHIA";
  const brandSize = 44;
  const brandWidth = bold.widthOfTextAtSize(brand, brandSize);
  page.drawText(brand, {
    x: (A4_WIDTH - brandWidth) / 2,
    y: A4_HEIGHT - 70,
    size: brandSize,
    font: bold,
    color: rgb(1, 1, 1),
  });

  const sub = "BY DR. SOPHIA";
  const subSize = 10;
  const subWidth = bold.widthOfTextAtSize(sub, subSize);
  page.drawText(sub, {
    x: (A4_WIDTH - subWidth) / 2,
    y: A4_HEIGHT - 88,
    size: subSize,
    font: bold,
    color: rgb(1, 1, 1),
  });
}

function drawDividerDots(page: PDFPage, y: number) {
  const usableWidth = A4_WIDTH - MARGIN_X * 2;
  const dotRadius = 1.2;
  const innerWidth = usableWidth - dotRadius * 2;
  // Endpoint dots
  page.drawCircle({ x: MARGIN_X, y, size: dotRadius, color: TEXT_MUTED });
  page.drawCircle({
    x: MARGIN_X + innerWidth,
    y,
    size: dotRadius,
    color: TEXT_MUTED,
  });
  // Thin connecting line
  page.drawLine({
    start: { x: MARGIN_X + dotRadius + 2, y },
    end: { x: MARGIN_X + innerWidth - dotRadius - 2, y },
    thickness: 0.4,
    color: TEXT_MUTED,
  });
}

export async function buildCourseProgramPdf(
  input: CourseProgramInput,
): Promise<Uint8Array> {
  const template = PROGRAM_TEMPLATES[input.courseKey];
  if (!template) {
    throw new Error(`No program template registered for course_key=${input.courseKey}`);
  }

  const cwd = process.cwd();
  const [boldBytes, regBytes] = await Promise.all([
    fs.readFile(path.join(cwd, "public", "fonts", "Roboto-Bold.ttf")),
    fs.readFile(path.join(cwd, "public", "fonts", "Roboto-Regular.ttf")),
  ]);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  const reg = await pdf.embedFont(regBytes, { subset: true });

  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);

  drawHeaderBar(page, bold);

  // ---- Title block (title + date, centred) ----
  // Auto-wrap the title so longer course names (e.g. "Aufbaukurs
  // Botulinum: Therapeutische Indikationen") spread across two lines
  // instead of overflowing the page width. The first segment of a
  // colon-separated title goes on line 1 in uppercase, the rest on
  // line 2 in title case — that matches the visual treatment Sophia
  // used in her reference PDF for the Aufbaukurs. Single-line titles
  // (Grundkurse) render exactly as before.
  const titleSize = 26;
  const titleLineHeight = 32;
  const titleMaxWidth = A4_WIDTH - MARGIN_X * 2;
  const titleLines = composeTitleLines(input.title, bold, titleSize, titleMaxWidth);
  let cursorY = A4_HEIGHT - HEADER_HEIGHT - 60;
  for (const line of titleLines) {
    const lineWidth = bold.widthOfTextAtSize(line, titleSize);
    page.drawText(line, {
      x: (A4_WIDTH - lineWidth) / 2,
      y: cursorY,
      size: titleSize,
      font: bold,
      color: TEXT_BLACK,
    });
    cursorY -= titleLineHeight;
  }
  const dateStr = formatDateDe(input.dateIso);
  const dateWidth = bold.widthOfTextAtSize(dateStr, titleSize);
  page.drawText(dateStr, {
    x: (A4_WIDTH - dateWidth) / 2,
    y: cursorY,
    size: titleSize,
    font: bold,
    color: TEXT_BLACK,
  });
  cursorY -= 28;

  drawDividerDots(page, cursorY);
  cursorY -= 24;

  // ---- Description ----
  const bodySize = 11;
  const bodyLineHeight = 16;
  const bodyMaxWidth = A4_WIDTH - MARGIN_X * 2;
  const descLines = wrapText(input.description, reg, bodySize, bodyMaxWidth);
  for (const line of descLines) {
    if (line === "") {
      cursorY -= bodyLineHeight * 0.6;
      continue;
    }
    page.drawText(line, {
      x: MARGIN_X,
      y: cursorY,
      size: bodySize,
      font: reg,
      color: TEXT_BLACK,
    });
    cursorY -= bodyLineHeight;
  }

  cursorY -= 24;

  // ---- Rahmenprogramm heading ----
  const headingSize = 14;
  const heading = "Rahmenprogramm";
  const headingWidth = bold.widthOfTextAtSize(heading, headingSize);
  page.drawText(heading, {
    x: (A4_WIDTH - headingWidth) / 2,
    y: cursorY,
    size: headingSize,
    font: bold,
    color: TEXT_BLACK,
  });
  cursorY -= 26;

  // ---- Rahmenprogramm rows ----
  const startMinutes = parseTimeToMinutes(input.startTime);
  const delta = startMinutes - template.referenceStartMinutes;
  const timeColX = MARGIN_X + 20;
  const labelColX = MARGIN_X + 110;
  const labelMaxWidth = A4_WIDTH - labelColX - MARGIN_X;
  for (const row of template.rows) {
    const timeStr = `${minutesToTime(template.referenceStartMinutes + row.offsetMin + delta)} Uhr`;
    page.drawText(timeStr, {
      x: timeColX,
      y: cursorY,
      size: bodySize,
      font: reg,
      color: TEXT_BLACK,
    });
    const labelLines = wrapText(row.label, reg, bodySize, labelMaxWidth);
    let lineY = cursorY;
    for (const line of labelLines) {
      page.drawText(line, {
        x: labelColX,
        y: lineY,
        size: bodySize,
        font: reg,
        color: TEXT_BLACK,
      });
      lineY -= bodyLineHeight;
    }
    cursorY -= bodyLineHeight * labelLines.length + 8;
  }

  // ---- Footer block ----
  cursorY -= 24;
  const footerSize = 10;
  const footerLineHeight = 14;
  const footerLines: string[] = [
    `Referent:in: ${input.instructorLine}`,
    "Veranstalterin und Organisatorin: Dr. Sophia Wilk-Vollmann, DESAIC",
    "Wissenschaftliche Leitung: Dr. Sophia Wilk-Vollmann, DESAIC",
    `Teilnehmendegebühr: ${template.teilnehmendegebuehrEur}€`,
    "Kein Sponsoring",
    "Anmeldung: fortlaufend über www.ephia.de",
  ];
  for (const line of footerLines) {
    page.drawText(line, {
      x: MARGIN_X + 20,
      y: cursorY,
      size: footerSize,
      font: reg,
      color: TEXT_BLACK,
    });
    cursorY -= footerLineHeight;
  }
  cursorY -= footerLineHeight * 0.5;
  const venue = input.address?.trim()
    ? `Fortbildungsstätte: ${input.address.trim()}`
    : "Fortbildungsstätte: noch nicht festgelegt";
  page.drawText(venue, {
    x: MARGIN_X + 20,
    y: cursorY,
    size: footerSize,
    font: reg,
    color: TEXT_BLACK,
  });

  return await pdf.save();
}
