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
  /** Visual centre X of the stamped number (the value is centred on this
   *  X, mirroring the name stamp). For certs whose master bakes a
   *  "VNR Theorie:" label, this sits just after that label's colon. */
  x: number;
  /** Baseline Y (PDF origin is bottom-left). */
  y: number;
  /** Font size in points. Defaults to 7pt — matches the footer. */
  size?: number;
  /** Optional label prefix drawn together with the number, e.g. "VNR".
   *  Set this only when the master PDF has NO baked "VNR …:" label and the
   *  generator must stamp the label itself (the standalone online certs).
   *  When set, the generator renders "<label> <number>" as one centred,
   *  letter-spaced line; when omitted it stamps just the bare number after
   *  the baked label, the legacy behaviour. */
  label?: string;
}

/** Static CME accreditation line drawn by the generator for certs whose
 *  master PDF ships with an EMPTY footer (no baked "… zertifiziert mit N
 *  CME-Punkten …" block). Praxis-only single-VNR certs use this — the
 *  Aufbaukurs Biostimulation & Skinbooster master carries only the
 *  signature block, so the generator stamps the CME line + VNR itself
 *  instead of relying on baked footer text. Both lines are letter-spaced
 *  and drawn in the footer rose, centred on x, mirroring the baked
 *  footers of the other certs. */
export interface CmeLinePosition {
  /** First line, e.g. "Der Kurs ist zertifiziert mit 12 CME-Punkten durch die". */
  line1: string;
  /** Optional second line, e.g. "Landesärztekammer Berlin". */
  line2?: string;
  /** Visual centre X. Same convention as the name + VNR stamps. */
  x: number;
  /** Baseline Y of line1. PDF origin is bottom-left; line2 sits `gap`
   *  points below. */
  y: number;
  /** Font size in points. Defaults to 8pt — matches the footer copy. */
  size?: number;
  /** Baseline drop from line1 to line2. Defaults to 12pt. */
  gap?: number;
}

/** Dynamic date stamp for the "Berlin, <Monat> <Jahr>" line in the footer.
 *  The baked-in date line was redacted out of the master PDFs, so the
 *  generator simply stamps the per-session date into the empty gap
 *  between "Landesärztekammer Berlin" and "VNR Theorie:" — letter-spaced
 *  in the footer's rose colour, no cover rectangle needed. */
export interface DateStampPosition {
  /** Visual centre X of the date line. Same convention as the name +
   *  VNR stamps: the text is centred around this X. */
  x: number;
  /** Baseline Y of the date text. PDF origin is bottom-left. */
  y: number;
  /** Font size in points. Defaults to 8pt — matches the footer copy. */
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
  /** City printed on the "<Stadt>, <Monat> <Jahr>" footer date line.
   *  Mirrors the accrediting chamber's place (Landesärztekammer Berlin →
   *  "Berlin", Landesärztekammer Brandenburg → "Brandenburg"). Defaults
   *  to "Berlin" when omitted. */
  footerCity?: string;
  /** When true, this cert is available in the manual Zertifikatgenerator
   *  but the post-praxis cron NEVER auto-sends it. Used for certs that
   *  are ready to render by hand but whose automated dispatch is not yet
   *  signed off. */
  generatorOnly?: boolean;
  /** When true, this cert belongs to a STANDALONE ONLINE course that has
   *  no course_sessions. The session-driven Zertifikatgenerator path skips
   *  it (no Kurstermine to match), so the page surfaces it through a
   *  session-less course type instead, pulling VNR Theorie straight from
   *  the course_templates row. No Praxis part, no per-session date. */
  online?: boolean;
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
    /** Optional static CME accreditation line. Set only for certs whose
     *  master has NO baked CME footer (praxis-only single-VNR certs). */
    cmeLine?: CmeLinePosition;
    /** Optional: when set, the generator stamps "Berlin, <Monat> <Jahr>"
     *  from the session's date_iso into the footer gap. Templates whose
     *  master carries no date line (e.g. the Zahnmedizin variant) omit
     *  this and the generator silently skips the stamp. */
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
      // The baked "Berlin, <Monat> <Jahr>" line was redacted out of the
      // master, leaving an empty gap between "Landesärztekammer Berlin"
      // and "VNR Theorie:". We stamp the per-session date back into that
      // gap at the original baseline, letter-spaced and at the VNR size.
      dateStamp: { x: 173, y: 81, size: 8 },
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
    // calibration is shared.
    //
    // Von der Landesärztekammer Berlin mit 12 CME-Punkten akkreditiert
    // (Anerkennungsbescheid vom 10.07.2026, Kategorie C). Es gibt keinen
    // Onlineteil, also EINE Veranstaltungsnummer pro Termin → nur VNR
    // Praxis. Der Master trägt keinen gebackenen CME/VNR-Footer (leerer
    // Fußbereich unter der Signatur), daher stampft der Generator die
    // CME-Zeile (cmeLine) statisch und die VNR selbst-beschriftet
    // ("VNR <Nummer>") in den freien Fußbereich. Koordinaten visuell
    // gegen den Master kalibriert.
    //
    // Da ein vnrPraxis-Slot gesetzt ist, gibt certificateRequiresVnr true
    // zurück und der Post-Praxis-Cron hält jede Buchung zurück
    // (cert_sent_at bleibt null), bis course_sessions.vnr_praxis in der DB
    // gefüllt ist. Die zurückgehaltenen Certs gehen dann beim nächsten
    // Cron-Lauf automatisch raus, ohne Code-Änderung.
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
      // Static CME line stamped into the empty footer, letter-spaced rose.
      // Two lines like the Botulinum footer, broken after "durch die".
      cmeLine: {
        line1: "Der Kurs ist zertifiziert mit 12 CME-Punkten durch die",
        line2: "Landesärztekammer Berlin",
        x: 173,
        y: 78,
        size: 8,
        gap: 12,
      },
      // Single self-labeled VNR ("VNR <number>") drawn below the CME line;
      // the value comes from course_sessions.vnr_praxis per session.
      vnrPraxis: { x: 173, y: 44, size: 8, label: "VNR" },
      // Per-session date stamped above the CME line, letter-spaced.
      dateStamp: { x: 173, y: 96, size: 8 },
    },
  },
  {
    // Grundkurs Dermalfiller. Identical layout and footer to the
    // Grundkurs Botulinum cert (left-column name above the dotted line,
    // photo on the right) — A4 landscape 842 × 595 pt. The master PDF
    // carries the same baked footer block: "18 CME-Punkte durch die
    // Landesärztekammer Berlin", a "Berlin, <Monat> <Jahr>" line, and
    // the "VNR Theorie:" / "VNR Praxis:" labels. So this cert uses the
    // exact same stamp slots as Botulinum.
    //
    // The Dermalfiller VNRs are assigned by the LÄK after the course is
    // held. Because vnrTheorie + vnrPraxis slots exist here,
    // certificateRequiresVnr returns true and the post-praxis cron holds
    // every booking back (cert_sent_at stays null) until both
    // course_templates.vnr_theorie and course_sessions.vnr_praxis are
    // filled in the DB. The held certs then ship automatically on the
    // next cron run — no code change needed.
    slug: "grundkurs-dermalfiller",
    label: "Grundkurs Dermalfiller",
    courseKeys: ["grundkurs_dermalfiller"],
    layout: {
      page: 1,
      centerX: 173,
      baselineY: 388,
      maxWidth: 290,
      targetSize: 28,
      minSize: 10,
      vnrTheorie: { x: 173, y: 57, size: 8 },
      vnrPraxis: { x: 173, y: 33, size: 8 },
      // Baked date line redacted out of the master; per-session date is
      // stamped back into the gap, letter-spaced and at the VNR size.
      // Sits a touch lower than the Botulinum cert (y 79 vs 81) so it
      // isn't crowding the "Landesärztekammer Berlin" line above it.
      dateStamp: { x: 173, y: 79, size: 8 },
    },
  },
  {
    // Aufbaukurs Botulinum "Therapeutische Indikationen". Same visual
    // layout as the other certs (left-column name above the dotted line,
    // photo on the right) — A4 landscape 842 × 595 pt. The supplied
    // master had no footer, so the CME/VNR footer block was copied 1:1
    // from the Grundkurs Botulinum master (identical text: "Der Kurs
    // ist zertifiziert mit 21 CME-Punkten durch die Landesärztekammer
    // Berlin" + "VNR Theorie:" / "VNR Praxis:" labels). Because the
    // baked footer is identical, the stamp coordinates match the
    // Grundkurs Botulinum cert exactly.
    //
    // Der Kurs ist mit 21 CME-Punkten LÄK-akkreditiert; die VNRs werden
    // pro Termin von der LÄK vergeben. Da vnrTheorie + vnrPraxis-Slots
    // gesetzt sind, gibt certificateRequiresVnr true zurück und der
    // Post-Praxis-Cron hält jede Buchung zurück (cert_sent_at bleibt
    // null), bis course_templates.vnr_theorie und
    // course_sessions.vnr_praxis in der DB gefüllt sind. Die
    // zurückgehaltenen Certs gehen dann beim nächsten Cron-Lauf
    // automatisch raus, ohne Code-Änderung.
    slug: "aufbaukurs-therapeutische-indikationen-botulinum",
    label: "Aufbaukurs Botulinum Therapeutische Indikationen",
    courseKeys: ["aufbaukurs_therapeutische_indikationen_botulinum"],
    layout: {
      page: 1,
      centerX: 173,
      baselineY: 388,
      maxWidth: 290,
      targetSize: 28,
      minSize: 10,
      vnrTheorie: { x: 173, y: 57, size: 8 },
      vnrPraxis: { x: 173, y: 33, size: 8 },
      dateStamp: { x: 173, y: 81, size: 8 },
    },
  },
  {
    // Aufbaukurs Dermalfiller "Lippen". Same visual layout as the other
    // certs (left-column name above the dotted line, photo on the right) —
    // A4 landscape 842 × 595 pt. The supplied master carried the date baked
    // in ("Berlin, Dezember 2025") and no VNR section, so we redacted the
    // date line out (white cover) and baked in the "VNR Theorie:" /
    // "VNR Praxis:" labels 1:1 with the Grundkurs Dermalfiller footer. The
    // baked CME line ("zertifiziert mit 13 CME-Punkten durch die
    // Landesärztekammer Berlin") stays as-is.
    //
    // Der Kurs ist mit 13 CME-Punkten LÄK-akkreditiert; die VNRs werden pro
    // Termin von der LÄK vergeben. Da vnrTheorie + vnrPraxis-Slots gesetzt
    // sind, gibt certificateRequiresVnr true zurück und der Post-Praxis-Cron
    // hält jede Buchung zurück (cert_sent_at bleibt null), bis
    // course_templates.vnr_theorie und course_sessions.vnr_praxis in der DB
    // gefüllt sind. Die zurückgehaltenen Certs gehen dann beim nächsten
    // Cron-Lauf automatisch raus, ohne Code-Änderung.
    slug: "aufbaukurs-lippen",
    label: "Aufbaukurs Dermalfiller Lippen",
    courseKeys: ["aufbaukurs_lippen"],
    layout: {
      page: 1,
      centerX: 173,
      baselineY: 388,
      maxWidth: 290,
      targetSize: 28,
      minSize: 10,
      // This master's MediaBox y-origin is 8.58pt (not 0), so every footer
      // coordinate is the visual image-y plus that offset. Date line was
      // redacted out; the per-session date is stamped back into the gap
      // between "Landesärztekammer Berlin" and the VNR labels. VNR values
      // land ~9pt below the baked labels, matching the Grundkurs
      // Dermalfiller footer rhythm.
      dateStamp: { x: 173, y: 70.6, size: 8 },
      vnrTheorie: { x: 173, y: 49.6, size: 8 },
      vnrPraxis: { x: 173, y: 26.6, size: 8 },
    },
  },
  {
    // Aufbaukurs Botulinum "Periorale Zone" — a STANDALONE ONLINE course.
    // It has no Praxis-Kurstermine, so it never matches the session-driven
    // path; the Zertifikatgenerator surfaces it via the `online` flag
    // instead (page.tsx builds a session-less course type and pulls
    // vnr_theorie straight from the course_templates row).
    //
    // Accredited by the Landesärztekammer BRANDENBURG with 10 CME-Punkten.
    // Online means a single accreditation number: only VNR Theorie is
    // stamped (from course_templates.vnr_theorie). There is no Praxis part,
    // so no vnrPraxis slot; and no per-session date, so no dateStamp slot.
    // The vnrTheorie y-coordinate follows the periorale footer's own 12pt
    // rhythm (calibrated in d0a804d). footerCity stays "Brandenburg" to
    // document the accrediting chamber even though no date line is drawn.
    // The master's baked "VNR Praxis:" label stays empty until a
    // Praxis-free master is supplied.
    //
    // generatorOnly stays true as a belt-and-braces guard: the post-praxis
    // cron is session-driven and would never match an online course anyway.
    slug: "aufbaukurs-botulinum-periorale-zone",
    label: "Aufbaukurs Botulinum Periorale Zone",
    courseKeys: ["aufbaukurs_botulinum_periorale_zone"],
    footerCity: "Brandenburg",
    generatorOnly: true,
    online: true,
    layout: {
      page: 1,
      centerX: 173,
      baselineY: 388,
      maxWidth: 290,
      targetSize: 28,
      minSize: 10,
      vnrTheorie: { x: 173, y: 40, size: 8 },
    },
  },
  {
    // Grundkurs Medizinische Hautpflege — a STANDALONE ONLINE course, same
    // shape as the Periorale Zone cert above: no Praxis-Kurstermine, so it
    // never matches the session-driven path; the Zertifikatgenerator
    // surfaces it via the `online` flag instead (page.tsx builds a
    // session-less course type).
    //
    // Accredited by the Landesärztekammer BRANDENBURG with 7 CME-Punkten.
    // Unlike the Periorale Zone master, this master's footer carries ONLY
    // the baked "7 CME-Punkte durch die Landesärztekammer Brandenburg"
    // line — there is no baked "VNR Theorie:" label. So the cert stamps a
    // self-labeled VNR line ("VNR <number>") into the gap below the CME
    // copy, pulling the number from course_templates.vnr_theorie. Only a
    // single Veranstaltungsnummer for the online course, so no vnrPraxis;
    // and no per-session date, so no dateStamp. footerCity stays
    // "Brandenburg" to document the accrediting chamber.
    //
    // generatorOnly stays true as a belt-and-braces guard: the post-praxis
    // cron is session-driven and would never match an online course anyway.
    slug: "grundkurs-medizinische-hautpflege",
    label: "Grundkurs Medizinische Hautpflege",
    courseKeys: ["grundkurs_medizinische_hautpflege"],
    footerCity: "Brandenburg",
    generatorOnly: true,
    online: true,
    layout: {
      page: 1,
      centerX: 173,
      baselineY: 388,
      maxWidth: 290,
      targetSize: 28,
      minSize: 10,
      // Self-labeled VNR line centred below "Landesärztekammer
      // Brandenburg". The master bakes no "VNR …:" label, so label:"VNR"
      // makes the generator draw "VNR <number>" as one letter-spaced rose
      // line. y=40 sits one footer-line (~12pt) below the CME copy.
      vnrTheorie: { x: 173, y: 40, size: 8, label: "VNR" },
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

/** Build the "<Stadt>, <Monat> <Jahr>" footer line for a given session
 *  date_iso (YYYY-MM-DD). The city mirrors the accrediting chamber and
 *  defaults to "Berlin". Returns null if the input can't be parsed —
 *  the caller then skips the stamp so we never accidentally draw a
 *  blank cover that hides the baked text without replacing it. */
function formatChamberDateLine(dateIso: string, city: string): string | null {
  const [y, m] = dateIso.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  return `${city}, ${MONTHS_DE_LONG[m - 1]} ${y}`;
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
    // When the master has no baked "VNR …:" label, the cert supplies its
    // own via theorieLayout.label and we render "<label> <number>" as one
    // letter-spaced line. Otherwise stamp the bare number after the baked
    // label, the legacy behaviour.
    const tSpaced = spaceDigits(
      theorieLayout.label ? `${theorieLayout.label} ${vnrTheorie}` : vnrTheorie,
    );
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
    // Mirrors the theorie branch: when the master has no baked "VNR …:"
    // label, the cert supplies its own via praxisLayout.label and we
    // render "<label> <number>" as one letter-spaced line. Otherwise
    // stamp the bare number after the baked label (legacy behaviour).
    const pSpaced = spaceDigits(
      praxisLayout.label ? `${praxisLayout.label} ${vnrPraxis}` : vnrPraxis,
    );
    const pWidth = regFont.widthOfTextAtSize(pSpaced, pSize);
    page.drawText(pSpaced, {
      x: praxisLayout.x - pWidth / 2,
      y: praxisLayout.y,
      size: pSize,
      font: regFont,
      color: rose,
    });
  }

  // Static CME accreditation line. Only certs whose master has NO baked
  // CME footer register a cmeLine slot (praxis-only single-VNR certs).
  // Both lines are letter-spaced rose and centred on x, matching the
  // baked footers of the other certs.
  const cmeLayout = template.layout.cmeLine;
  if (cmeLayout) {
    const cSize = cmeLayout.size ?? 8;
    const drawCmeLine = (text: string, y: number) => {
      const spaced = spaceDigits(text);
      const w = regFont.widthOfTextAtSize(spaced, cSize);
      page.drawText(spaced, {
        x: cmeLayout.x - w / 2,
        y,
        size: cSize,
        font: regFont,
        color: rose,
      });
    };
    drawCmeLine(cmeLayout.line1, cmeLayout.y);
    if (cmeLayout.line2) {
      drawCmeLine(cmeLayout.line2, cmeLayout.y - (cmeLayout.gap ?? 12));
    }
  }

  // Dynamic "Berlin, <Monat> <Jahr>" line. Two gates have to pass:
  //  1. The template registers a dateStamp slot (the Zahnmedizin cert
  //     does not, because its master PDF carries no date line).
  //  2. The caller supplied a session date_iso we can parse.
  // The baked date line was redacted out of the master PDFs, so we just
  // stamp the date into the now-empty gap — letter-spaced and at the
  // same size as the VNR numbers so it matches the surrounding footer.
  const dateLayout = template.layout.dateStamp;
  if (dateLayout && sessionDateIso) {
    const dateLine = formatChamberDateLine(
      sessionDateIso,
      template.footerCity ?? "Berlin",
    );
    if (dateLine) {
      const dSize = dateLayout.size ?? 8;
      const dSpaced = spaceDigits(dateLine);
      const dWidth = regFont.widthOfTextAtSize(dSpaced, dSize);
      page.drawText(dSpaced, {
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

/** True when this cert template stamps AT LEAST ONE VNR on the rendered
 *  PDF (theorie, praxis, or both). Callers that need to know WHICH VNRs
 *  are required check `layout.vnrTheorie` / `layout.vnrPraxis` per slot —
 *  a praxis-only course (Aufbaukurs Biostimulation & Skinbooster) carries
 *  only a praxis VNR and would never satisfy an AND-of-both check. */
export function certificateRequiresVnr(template: CertificateTemplate): boolean {
  return !!(template.layout.vnrTheorie || template.layout.vnrPraxis);
}
