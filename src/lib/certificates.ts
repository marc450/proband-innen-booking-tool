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

/** Dynamic date stamp for the "Berlin, <Monat> <Jahr>" line in the footer.
 *  The master PDF for these certs was exported with a fixed month baked
 *  into the layout (e.g. "Berlin, November 2025"). To make the cert show
 *  the right month per session WITHOUT re-exporting the master, we draw
 *  a rose-coloured rectangle over the baked line and stamp the dynamic
 *  date on top in the same brownish footer colour. */
export interface DateStampPosition {
  /** Visual centre X of the new date line. Same convention as the name
   *  + VNR stamps: the text is centred around this X. */
  x: number;
  /** Baseline Y of the new date text. PDF origin is bottom-left. */
  y: number;
  /** Font size in points. Defaults to 8pt — matches the footer copy. */
  size?: number;
  /** Cover rectangle that hides the baked-in date line. Drawn in the
   *  rose brand colour to blend with the cert background. Box origin
   *  is bottom-left in PDF user units. Make it slightly wider than the
   *  longest expected month name to avoid visible edges. */
  cover: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
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
  /** Explicit "this cert carries CME and must NOT be issued without its
   *  VNR numbers" flag. Use it for a CME course whose master PDF does
   *  NOT yet have the baked "VNR Theorie:" / "VNR Praxis:" labels (so
   *  the layout.vnr* stamp slots can't be calibrated yet). The cron then
   *  holds every booking on such a cert — no email goes out — until both
   *  the DB VNR values are filled in AND the cert gains its stamp slots.
   *  When omitted, VNR-requirement is inferred from the presence of the
   *  layout.vnrTheorie + layout.vnrPraxis stamp slots (legacy behaviour).
   *  Set it to `false` to force a cert to be CME-free even if it somehow
   *  carries stamp slots (not currently needed). */
  requiresVnr?: boolean;
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
    /** Optional: when set, the generator covers the baked-in date line
     *  with a rose rectangle and stamps "Berlin, <Monat> <Jahr>" from
     *  the session's date_iso on top. Templates without a baked date
     *  (e.g. the Zahnmedizin variant) omit this and the generator
     *  silently skips the stamp. */
    dateStamp?: DateStampPosition;
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
      // underline in the left column of page 1. The name must always
      // fit comfortably inside that underline — long titled names
      // (e.g. "Dr. med. Markus von Schaewen") were running right up
      // to its edges, so maxWidth is held at ~90% of the dotted line
      // width to keep ~5% padding on each side. minSize gives the
      // shrink-to-fit loop more headroom for very long names.
      centerX: 173,
      baselineY: 388,
      maxWidth: 290,
      targetSize: 28,
      minSize: 10,
      // VNR lines are baked as labels ("VNR Theorie:" / "VNR Praxis:")
      // in the footer. The number is stamped just after the colon on
      // the same baseline. Calibrated visually against the reference
      // PDF Marc supplied.
      // X matches the name (centerX=173). Y calibrated below the
      // baked-in "VNR Theorie:" / "VNR Praxis:" labels.
      vnrTheorie: { x: 173, y: 57, size: 8 },
      vnrPraxis: { x: 173, y: 33, size: 8 },
      // The master PDF has "Berlin, November 2025" baked into the
      // footer between "Landesärztekammer Berlin" and "VNR Theorie:".
      // We cover that line with a rose rectangle and stamp the actual
      // session month on top. Sized to fit the longest month name
      // ("September"); the cover height has a small margin so the
      // baked descenders/ascenders don't peek through.
      dateStamp: {
        x: 173,
        y: 81,
        size: 8,
        cover: { x: 73, y: 76, width: 200, height: 14 },
      },
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
      maxWidth: 290,
      targetSize: 28,
      minSize: 10,
    },
  },
  {
    // Aufbaukurs Biostimulation & Skinbooster (Skulptra). Same visual
    // layout as the Botulinum certs (left-column name above dotted
    // line, photo on the right) — A4 landscape 842 × 595 pt — so the
    // calibration is shared. CME ist aktuell beantragt, aber noch
    // nicht akkreditiert; deshalb keine VNR-Stempel auf dem Master-
    // PDF und kein VNR-Layout hier. Sobald die LÄK-Akkreditierung
    // landet, vnrTheorie/vnrPraxis-Slots ergänzen + neuen Master mit
    // gebackenen Labels einspielen.
    slug: "aufbaukurs-skulptra",
    label: "Aufbaukurs Biostimulation & Skinbooster",
    courseKeys: ["aufbaukurs_skulptra"],
    layout: {
      page: 1,
      centerX: 173,
      baselineY: 388,
      maxWidth: 290,
      targetSize: 28,
      minSize: 10,
      // Master PDF has "Berlin, April 2026" baked in as the only footer
      // line (no VNR section because CME ist noch nicht akkreditiert).
      // Same cover-and-stamp trick as the Botulinum cert; calibrated
      // a touch lower since the line sits alone in the footer.
      dateStamp: {
        x: 173,
        y: 75,
        size: 8,
        cover: { x: 73, y: 70, width: 200, height: 14 },
      },
    },
  },
  {
    // Grundkurs Dermalfiller. Same visual layout as the Botulinum certs
    // (left-column name above the dotted line, photo on the right) —
    // A4 landscape 842 × 595 pt — so the name calibration is shared.
    // Der Kurs ist mit 18 CME-Punkten durch die LÄK Berlin zertifiziert,
    // aber der aktuelle Master trägt noch KEINE gebackenen VNR-Labels
    // und keine "Berlin, <Monat> <Jahr>"-Zeile. Deshalb hier vorerst nur
    // der Namensstempel, kein VNR-Layout und kein dateStamp.
    //
    // requiresVnr: true hält ALLE Dermalfiller-Zertifikate zurück, bis
    // die VNR-Nummern vorliegen — kein Zertifikat geht ohne VNR raus.
    // Sobald die LÄK die VNRs vergibt: (1) neuen Master mit gebackenen
    // "VNR Theorie:" / "VNR Praxis:"-Labels (und ggf. Datumszeile)
    // einspielen, (2) vnrTheorie/vnrPraxis + dateStamp analog zum
    // Botulinum-Cert ergänzen und visuell kalibrieren, (3) vnr_theorie
    // (course_templates) + vnr_praxis (course_sessions) in der DB füllen.
    // Der nächste Cron-Lauf verschickt die zurückgehaltenen Zertifikate
    // dann automatisch.
    slug: "grundkurs-dermalfiller",
    label: "Grundkurs Dermalfiller",
    courseKeys: ["grundkurs_dermalfiller"],
    requiresVnr: true,
    layout: {
      page: 1,
      centerX: 173,
      baselineY: 388,
      maxWidth: 290,
      targetSize: 28,
      minSize: 10,
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

/** Strip Latin-style specialisation suffixes from an academic title so
 *  the cert reads "Dr. Marc Wyss" instead of "Dr. med. dent. Marc Wyss".
 *  Anything BEFORE "Dr." (e.g. "Prof.", "PD") is preserved; only the
 *  qualifiers AFTER it are dropped. Titles without a "Dr." word are
 *  passed through unchanged so e.g. "Prof." or "Mag." aren't mangled.
 */
function simplifyTitleForCertificate(title: string): string {
  const match = title.match(/^(.*?\bDr)\.?\b/i);
  if (!match) return title.trim();
  return `${match[1].trim()}.`;
}

export function formatParticipantName(parts: {
  title?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const t = parts.title?.trim();
  const effectiveTitle =
    !t || t.toLowerCase() === "kein titel"
      ? null
      : simplifyTitleForCertificate(t);
  return [effectiveTitle, parts.firstName?.trim(), parts.lastName?.trim()]
    .filter(Boolean)
    .join(" ");
}

/** Space characters out ("276102" → "2 7 6 1 0 2") to match the
 *  letter-spaced style of the footer text ("V N R  T h e o r i e"). */
function spaceDigits(value: string): string {
  return value.split("").join(" ");
}

const MONTHS_DE_LONG = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/** Build the "Berlin, <Monat> <Jahr>" footer line for a given session
 *  date_iso (YYYY-MM-DD). Returns null if the input can't be parsed —
 *  the caller then skips the stamp so we never accidentally draw a
 *  blank cover that hides the baked text without replacing it. */
function formatBerlinDateLine(dateIso: string): string | null {
  const [y, m] = dateIso.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  return `Berlin, ${MONTHS_DE_LONG[m - 1]} ${y}`;
}

export async function generateCertificatePdf(opts: {
  template: CertificateTemplate;
  fullName: string;
  /** VNR Theorie. Ignored if the template has no vnrTheorie layout. */
  vnrTheorie?: string;
  /** VNR Praxis. Ignored if the template has no vnrPraxis layout. */
  vnrPraxis?: string;
  /** Session date in YYYY-MM-DD. When set AND the template has a
   *  `dateStamp` layout slot, the generator covers the baked footer
   *  date line and stamps "Berlin, <Monat> <Jahr>" in its place. When
   *  omitted, the baked date is left as-is, which matches the legacy
   *  behaviour for callers that haven't been migrated yet. */
  sessionDateIso?: string;
}): Promise<Uint8Array> {
  const { template, fullName, vnrTheorie, vnrPraxis, sessionDateIso } = opts;

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

  // Dynamic "Berlin, <Monat> <Jahr>" line. Two gates have to pass:
  //  1. The template registers a dateStamp slot (the Zahnmedizin cert
  //     does not, because its master PDF carries no date line).
  //  2. The caller supplied a session date_iso we can parse.
  // When both apply, we draw a rose-coloured rectangle over the baked
  // line in the master PDF and stamp the new date centred on top.
  // The rectangle colour matches the cert's rose background (#FAEBE1)
  // so the cover blends with the surrounding area.
  const dateLayout = template.layout.dateStamp;
  if (dateLayout && sessionDateIso) {
    const dateLine = formatBerlinDateLine(sessionDateIso);
    if (dateLine) {
      // The cert master PDFs were exported with a slightly warmer beige
      // than the canonical brand rose #FAEBE1 — using the pure brand
      // colour here leaves a visibly pink patch over the baked date.
      // This value was calibrated against the actual rendered cert
      // background. If the master PDFs are ever re-exported, re-sample
      // and update here.
      const certBackground = rgb(0.965, 0.91, 0.847);
      page.drawRectangle({
        x: dateLayout.cover.x,
        y: dateLayout.cover.y,
        width: dateLayout.cover.width,
        height: dateLayout.cover.height,
        color: certBackground,
      });
      const dSize = dateLayout.size ?? 8;
      const dWidth = regFont.widthOfTextAtSize(dateLine, dSize);
      page.drawText(dateLine, {
        x: dateLayout.x - dWidth / 2,
        y: dateLayout.y,
        size: dSize,
        font: regFont,
        color: rose,
      });
    }
  }

  return await pdf.save();
}

/** True when this cert template stamps VNRs on the rendered PDF. UI
 *  callers (the test form) use this to decide whether to require VNR
 *  inputs at submit time. */
export function certificateRequiresVnr(template: CertificateTemplate): boolean {
  // Explicit opt-in/out wins. Used for CME certs whose master PDF has no
  // baked VNR labels yet, so the stamp slots can't exist but the cert
  // must still be held back until VNRs land (e.g. Grundkurs Dermalfiller).
  if (template.requiresVnr !== undefined) return template.requiresVnr;
  // Legacy inference: a cert that carries both VNR stamp slots requires
  // VNR by construction (e.g. Grundkurs Botulinum).
  return !!(template.layout.vnrTheorie && template.layout.vnrPraxis);
}

/** True when the cert can actually STAMP its VNR numbers onto the PDF,
 *  i.e. both stamp slots are calibrated. A cert can `requiresVnr` without
 *  yet being able to stamp (master PDF still missing the baked labels);
 *  the cron uses this to hold such certs back even if the DB VNR values
 *  were filled in early. */
export function certificateCanStampVnr(template: CertificateTemplate): boolean {
  return !!(template.layout.vnrTheorie && template.layout.vnrPraxis);
}
