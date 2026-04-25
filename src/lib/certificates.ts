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
  /** `course_templates.course_key` values this cert applies to. The
   *  post-praxis cron uses this to decide whether to send a certificate
   *  for a given session; if no entry matches the session's course_key,
   *  no email is sent. */
  courseKeys: string[];
  /** When true, this cert is exclusively for Zahnärzt:innen — used as the
   *  override for dentists sitting in a shared Botulinum Praxiskurs whose
   *  audience_tag = "Zahnmediziner:in" or whose linked auszubildende has
   *  specialty = "Zahnmedizin". Optional: a regular cert leaves it unset. */
  isDentist?: boolean;
  /** Name-line calibration. Coordinates are in PDF user units with
   *  origin at the bottom-left of the page. VNR fields are optional —
   *  certs that don't carry CME points (e.g. the Zahnmedizin variant)
   *  omit them and only stamp the participant name. */
  layout: {
    page: number; // 1-indexed
    centerX: number;
    baselineY: number;
    maxWidth: number;
    targetSize: number;
    minSize: number;
    vnrTheorie?: VnrStampPosition;
    vnrPraxis?: VnrStampPosition;
  };
}

// Registry of known certificate templates. Add a new entry when a new
// course-specific certificate is added; drop the master PDF into
// public/certificates/<slug>.pdf and calibrate the coordinates visually.
export const CERTIFICATE_TEMPLATES: CertificateTemplate[] = [
  {
    slug: "grundkurs-botulinum",
    label: "Grundkurs Botulinum",
    courseKeys: ["grundkurs_botulinum"],
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
      vnrTheorie: { x: 173, y: 57, size: 8 },
      vnrPraxis: { x: 173, y: 33, size: 8 },
    },
  },
  {
    // Zahnmedizin variant of the Grundkurs Botulinum cert. Carries no
    // CME points (CME accreditation is for Humanmediziner:innen only),
    // so the VNR stamps are omitted and the cert renders just the
    // participant name. Used for Zahnärzt:innen sitting in the shared
    // Botulinum Praxiskurs — selected via the audience_tag /
    // specialty override in send-post-praxis-certificate, never via
    // course_key alone, because legacy imports booked them under the
    // regular grundkurs_botulinum template.
    slug: "grundkurs-botulinum-zahnmedizin",
    label: "Grundkurs Botulinum für Zahnärzt:innen",
    courseKeys: ["grundkurs_botulinum_zahnmedizin"],
    isDentist: true,
    layout: {
      // Same coordinates as the regular Grundkurs Botulinum cert —
      // both PDFs share the layout for the name; only the body copy
      // and VNR section differ.
      page: 1,
      centerX: 173,
      baselineY: 388,
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

/** Return the cert template registered for a given course_templates.course_key,
 *  or undefined if none is registered. The cron uses this to decide whether
 *  to emit a post-praxis certificate email at all. */
export function getCertificateForCourseKey(
  courseKey: string | null | undefined,
): CertificateTemplate | undefined {
  if (!courseKey) return undefined;
  return CERTIFICATE_TEMPLATES.find((t) => t.courseKeys.includes(courseKey));
}

/** Return the cert template that should be sent for a specific booking.
 *
 *  Two paths can flag a participant as a dentist:
 *    1. New system: course-checkout sets course_bookings.audience_tag
 *       = "Zahnmediziner:in" for any booking made via the
 *       grundkurs_botulinum_zahnmedizin landing page.
 *    2. Legacy import: bookings carried over from Lovable+Zapier are
 *       attached to the regular grundkurs_botulinum template, so the
 *       only signal is auszubildende.specialty = "Zahnmedizin".
 *
 *  When either path applies and a dentist cert exists in the registry
 *  for the same course family, the dentist cert is preferred over the
 *  Humanmediziner:innen variant. The function looks up "the same family"
 *  by walking back from the dentist cert's first courseKey to find a
 *  sibling — kept loose so adding new dentist certs only requires
 *  updating the registry, not this lookup.
 */
export function getCertificateForBooking(opts: {
  /** course_templates.course_key tied to the session via course_sessions.template_id */
  sessionCourseKey: string | null | undefined;
  /** course_bookings.audience_tag — "Zahnmediziner:in" / "Humanmediziner:in" / null */
  audienceTag: string | null | undefined;
  /** auszubildende.specialty, e.g. "Zahnmedizin", "Allgemeinmedizin", ... */
  specialty: string | null | undefined;
}): CertificateTemplate | undefined {
  const { sessionCourseKey, audienceTag, specialty } = opts;
  const isDentist =
    audienceTag === "Zahnmediziner:in" ||
    (specialty || "").trim().toLowerCase() === "zahnmedizin";

  if (isDentist) {
    // Pick a dentist cert in the same family as the session's course_key.
    // The dentist cert's courseKeys list contains the dentist-specific
    // course key (e.g. "grundkurs_botulinum_zahnmedizin"); we accept it
    // for any session whose course_key shares the same Botulinum stem.
    const dentistCert = CERTIFICATE_TEMPLATES.find(
      (t) =>
        t.isDentist &&
        (sessionCourseKey
          ? t.courseKeys.some((k) => sharesCourseFamily(k, sessionCourseKey))
          : true),
    );
    if (dentistCert) return dentistCert;
    // Fall through if no dentist cert is registered for this family.
  }

  return getCertificateForCourseKey(sessionCourseKey);
}

/** Two course_keys share a family if one is a prefix of the other after
 *  stripping the Zahnmedizin suffix. Lets the registry stay declarative
 *  ("grundkurs_botulinum_zahnmedizin" is the dentist sibling of
 *  "grundkurs_botulinum") without hardcoding pairs in a switch. */
function sharesCourseFamily(a: string, b: string): boolean {
  const stem = (k: string) => k.replace(/_zahnmedizin$/, "");
  return stem(a) === stem(b);
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
  /** VNR Theorie. Ignored if the template has no vnrTheorie layout. */
  vnrTheorie?: string;
  /** VNR Praxis. Ignored if the template has no vnrPraxis layout. */
  vnrPraxis?: string;
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
  // the visual CENTER, mirroring how the name is placed. Either VNR
  // is optional — certs without CME (e.g. the Zahnmedizin variant)
  // simply omit the field and we skip the stamp here. The drawText
  // call is gated on both the layout slot existing AND the caller
  // providing a non-empty value, so legacy callers that always pass
  // strings keep working.
  const rose = rgb(0.75, 0.47, 0.37);
  const theorieLayout = template.layout.vnrTheorie;
  if (theorieLayout && vnrTheorie?.trim()) {
    const tSize = theorieLayout.size ?? 7;
    const tSpaced = spaceDigits(vnrTheorie);
    const tWidth = regFont.widthOfTextAtSize(tSpaced, tSize);
    page.drawText(tSpaced, {
      x: theorieLayout.x - tWidth / 2,
      y: theorieLayout.y,
      size: tSize,
      font: regFont,
      color: rose,
    });
  }
  const praxisLayout = template.layout.vnrPraxis;
  if (praxisLayout && vnrPraxis?.trim()) {
    const pSize = praxisLayout.size ?? 7;
    const pSpaced = spaceDigits(vnrPraxis);
    const pWidth = regFont.widthOfTextAtSize(pSpaced, pSize);
    page.drawText(pSpaced, {
      x: praxisLayout.x - pWidth / 2,
      y: praxisLayout.y,
      size: pSize,
      font: regFont,
      color: rose,
    });
  }

  return await pdf.save();
}

/** True when this cert template stamps VNRs on the rendered PDF. UI
 *  callers (the test form) use this to decide whether to require VNR
 *  inputs at submit time. */
export function certificateRequiresVnr(template: CertificateTemplate): boolean {
  return !!(template.layout.vnrTheorie && template.layout.vnrPraxis);
}
