import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/**
 * Renders a CME participation certificate by stamping the participant's
 * full name (Roboto Bold) and the two VNR numbers (Roboto Regular, rose
 * to match the footer copy) onto a standardised template PDF. One
 * template per course, stored under public/certificates/<slug>.pdf.
 *
 * The name auto-shrinks so it always fits on one line regardless of
 * title length. The VNR numbers are rendered with character spacing to
 * match the footer typographic style.
 */

export interface VnrStampPosition {
  /** Left edge of the number (right after the ":" of the baked label). */
  x: number;
  /** Baseline Y (PDF origin is bottom-left). */
  y: number;
  /** Font size in points. Defaults to 7pt — matches the footer. */
  size?: number;
}

export interface CertificateTemplate {
  /** URL slug + filename stem under public/certificates/<slug>.pdf */
  slug: string;
  /** Display name shown in admin UIs */
  label: string;
  /** Name-line calibration. Coordinates are in PDF user units with
   *  origin at the bottom-left of the page. */
  layout: {
    page: number; // 1-indexed
    centerX: number;
    baselineY: number;
    maxWidth: number;
    targetSize: number;
    minSize: number;
    vnrTheorie: VnrStampPosition;
    vnrPraxis: VnrStampPosition;
  };
}

// Registry of known certificate templates. Add a new entry when a new
// course-specific certificate is added; drop the master PDF into
// public/certificates/<slug>.pdf and calibrate the coordinates visually.
export const CERTIFICATE_TEMPLATES: CertificateTemplate[] = [
  {
    slug: "grundkurs-botulinum",
    label: "Grundkurs Botulinum",
    layout: {
      page: 1,
      // A4 landscape, 842 x 595 pt. Name sits centred over the dotted
      // underline in the left column of page 1.
      centerX: 173,
      baselineY: 388,
      maxWidth: 325,
      targetSize: 28,
      minSize: 12,
      // VNR lines are baked as labels ("VNR Theorie:" / "VNR Praxis:")
      // in the footer. The number is stamped just after the colon on
      // the same baseline. Calibrated visually against the reference
      // PDF Marc supplied.
      // X matches the name (centerX=173). Y calibrated below the
      // baked-in "VNR Theorie:" / "VNR Praxis:" labels.
      vnrTheorie: { x: 173, y: 57, size: 7 },
      vnrPraxis: { x: 173, y: 33, size: 7 },
    },
  },
];

export function getCertificateTemplate(
  slug: string,
): CertificateTemplate | undefined {
  return CERTIFICATE_TEMPLATES.find((t) => t.slug === slug);
}

export function formatParticipantName(parts: {
  title?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const t = parts.title?.trim();
  const effectiveTitle = !t || t.toLowerCase() === "kein titel" ? null : t;
  return [effectiveTitle, parts.firstName?.trim(), parts.lastName?.trim()]
    .filter(Boolean)
    .join(" ");
}

/** Space characters out ("276102" → "2 7 6 1 0 2") to match the
 *  letter-spaced style of the footer text ("V N R  T h e o r i e"). */
function spaceDigits(value: string): string {
  return value.split("").join(" ");
}

export async function generateCertificatePdf(opts: {
  template: CertificateTemplate;
  fullName: string;
  vnrTheorie: string;
  vnrPraxis: string;
}): Promise<Uint8Array> {
  const { template, fullName, vnrTheorie, vnrPraxis } = opts;

  const cwd = process.cwd();
  const [templateBytes, boldBytes, regBytes] = await Promise.all([
    fs.readFile(path.join(cwd, "public", "certificates", `${template.slug}.pdf`)),
    fs.readFile(path.join(cwd, "public", "fonts", "Roboto-Bold.ttf")),
    fs.readFile(path.join(cwd, "public", "fonts", "Roboto-Regular.ttf")),
  ]);

  const pdf = await PDFDocument.load(templateBytes);
  pdf.registerFontkit(fontkit);
  const boldFont = await pdf.embedFont(boldBytes, { subset: true });
  const regFont = await pdf.embedFont(regBytes, { subset: true });

  const pageIndex = Math.max(0, template.layout.page - 1);
  const page = pdf.getPages()[pageIndex];
  if (!page) throw new Error(`Template has no page ${template.layout.page}`);

  // Name: shrink-to-fit at the calibrated center.
  let size = template.layout.targetSize;
  while (size > template.layout.minSize) {
    const w = boldFont.widthOfTextAtSize(fullName, size);
    if (w <= template.layout.maxWidth) break;
    size -= 1;
  }
  const textWidth = boldFont.widthOfTextAtSize(fullName, size);
  page.drawText(fullName, {
    x: template.layout.centerX - textWidth / 2,
    y: template.layout.baselineY,
    size,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // VNRs: rose, regular weight, letter-spaced, centred on the same x
  // as the name above. `vnrTheorie.x` / `vnrPraxis.x` are treated as
  // the visual CENTER, mirroring how the name is placed.
  const rose = rgb(0.75, 0.47, 0.37);
  const tSize = template.layout.vnrTheorie.size ?? 7;
  const pSize = template.layout.vnrPraxis.size ?? 7;
  const tSpaced = spaceDigits(vnrTheorie);
  const pSpaced = spaceDigits(vnrPraxis);
  const tWidth = regFont.widthOfTextAtSize(tSpaced, tSize);
  const pWidth = regFont.widthOfTextAtSize(pSpaced, pSize);
  page.drawText(tSpaced, {
    x: template.layout.vnrTheorie.x - tWidth / 2,
    y: template.layout.vnrTheorie.y,
    size: tSize,
    font: regFont,
    color: rose,
  });
  page.drawText(pSpaced, {
    x: template.layout.vnrPraxis.x - pWidth / 2,
    y: template.layout.vnrPraxis.y,
    size: pSize,
    font: regFont,
    color: rose,
  });

  return await pdf.save();
}
