import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/**
 * Renders a CME participation certificate by stamping the participant's
 * full name onto a standardised template PDF. One template per course
 * (keyed by slug), stored under public/certificates/<slug>.pdf. Uses
 * Roboto Bold (public/fonts/Roboto-Bold.ttf) to match the website.
 *
 * The name auto-shrinks so it always fits on one line regardless of
 * title length — "Anna Schmidt" renders at full 36pt, "Prof. Dr. Dr.
 * Maximilian Wolfgang von Bergsträsser-Schmidt" shrinks until it fits.
 */

export interface CertificateTemplate {
  /** URL slug + filename stem under public/certificates/<slug>.pdf */
  slug: string;
  /** Display name shown in admin UIs */
  label: string;
  /** Layout calibration for this specific template. Coordinates are in
   *  PDF user units with origin at the bottom-left of the page. */
  layout: {
    page: number; // 1-indexed
    centerX: number;
    baselineY: number;
    maxWidth: number;
    targetSize: number;
    minSize: number;
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
      // underline in the left column of page 1. Calibrated visually by
      // rendering y-markers on the template and positioning the name
      // between "Hiermit wird bestätigt, dass" (baseline ~430) and the
      // underline (~390). Values locked in on short ("Dr. Marc Wyss")
      // and long ("Prof. Dr. Dr. Maximilian von Bergsträsser-Schmidt")
      // test names — both render within the underline width.
      centerX: 237,
      baselineY: 395,
      maxWidth: 325,
      targetSize: 28,
      minSize: 12,
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

export async function generateCertificatePdf(opts: {
  template: CertificateTemplate;
  fullName: string;
}): Promise<Uint8Array> {
  const { template, fullName } = opts;

  const templatePath = path.join(
    process.cwd(),
    "public",
    "certificates",
    `${template.slug}.pdf`,
  );
  const fontPath = path.join(
    process.cwd(),
    "public",
    "fonts",
    "Roboto-Bold.ttf",
  );

  const [templateBytes, fontBytes] = await Promise.all([
    fs.readFile(templatePath),
    fs.readFile(fontPath),
  ]);

  const pdf = await PDFDocument.load(templateBytes);
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });

  const pageIndex = Math.max(0, template.layout.page - 1);
  const page = pdf.getPages()[pageIndex];
  if (!page) throw new Error(`Template has no page ${template.layout.page}`);

  // Shrink-to-fit: step size down 1pt at a time until the measured width
  // is within maxWidth. Floor at minSize so we never render something
  // unreadable, even for hypothetical worst-case names.
  let size = template.layout.targetSize;
  while (size > template.layout.minSize) {
    const w = font.widthOfTextAtSize(fullName, size);
    if (w <= template.layout.maxWidth) break;
    size -= 1;
  }

  const textWidth = font.widthOfTextAtSize(fullName, size);
  const x = template.layout.centerX - textWidth / 2;

  page.drawText(fullName, {
    x,
    y: template.layout.baselineY,
    size,
    font,
    color: rgb(0, 0, 0),
  });

  return await pdf.save();
}
