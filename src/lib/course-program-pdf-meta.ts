/**
 * Client-safe sibling of course-program-pdf.ts. The main generator
 * imports node:fs and pdf-lib (server-only); UI code only needs to
 * know whether a given course_key has a registered program template
 * so it can show or hide the download button. Keep this list in sync
 * with PROGRAM_TEMPLATES in course-program-pdf.ts.
 */

export const COURSE_KEYS_WITH_PROGRAM_PDF: ReadonlySet<string> = new Set([
  "grundkurs_botulinum",
  "grundkurs_dermalfiller",
]);

export function hasProgramTemplate(courseKey: string | null | undefined): boolean {
  return !!courseKey && COURSE_KEYS_WITH_PROGRAM_PDF.has(courseKey);
}
