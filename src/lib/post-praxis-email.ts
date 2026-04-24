import { buildEmailHtml, type ContentBlock } from "@/lib/email-template";

const COMMUNITY_URL = "https://chat.whatsapp.com/DfbOTDsWWksFQJhVOqdPJI";
const TRUSTPILOT_URL = "https://de.trustpilot.com/review/drsophia.academy";
const FEEDBACK_MAILTO = "mailto:sophia@ephia.de,marc@ephia.de";
const INSTAGRAM_URL = "https://www.instagram.com/ephia.academy/";

export interface PostPraxisEmailParams {
  firstName: string;
  /** Public-facing course name (course_label_de or template.title). */
  courseName: string;
  /** Pre-formatted course day, e.g. "26. April 2026". */
  courseDay: string;
}

/** Subject line for the post-praxis certificate email. */
export function buildPostPraxisEmailSubject(
  params: Pick<PostPraxisEmailParams, "courseName">,
): string {
  return `Dein Zertifikat, ${params.courseName}`;
}

/** Renders the post-praxis certificate email body. Pairs with a PDF
 *  attachment. Four CTAs stacked as buttons: Community, Trustpilot,
 *  Feedback (mailto), Instagram. */
export function buildPostPraxisEmailHtml(
  params: PostPraxisEmailParams,
): string {
  const { firstName, courseName, courseDay } = params;

  const blocks: ContentBlock[] = [
    {
      type: "text",
      text: `<p>herzlichen Dank, dass Du am <strong>${courseDay}</strong> bei unserem <strong>${courseName}</strong> dabei warst. Wir hoffen, Du nimmst viele wertvolle Erkenntnisse mit und kannst Dein Wissen nun sicher und souverän in Deiner Praxis anwenden.</p>
<p><strong>Dein Zertifikat</strong></p>
<p>Dein persönliches Zertifikat findest Du im Anhang dieser E-Mail. Bitte prüfe kurz, ob Name und Titel korrekt geschrieben sind. Falls etwas nicht stimmt, antworte einfach auf diese E-Mail oder melde Dich bei <a href="mailto:customerlove@ephia.de">customerlove@ephia.de</a>.</p>
<p>🤝 <strong>Werde Teil unserer Community</strong></p>
<p>Wir wollen Dich auch nach dem Kurs nicht alleine lassen. In der EPHIA-Community tauschst Du Dich mit unseren Dozent:innen aus, stellst Fragen und vernetzt Dich mit Ärzt:innen, die denselben Weg gehen wie Du.</p>`,
    },
    { type: "button", label: "Community beitreten", url: COMMUNITY_URL },
    {
      type: "text",
      text: `<p>✨ <strong>Schreib uns eine Trustpilot-Review</strong></p>
<p>Reviews helfen uns sehr dabei, unsere Sichtbarkeit zu erhöhen und Vertrauen aufzubauen. Über ein paar Zeilen von Dir würden wir uns riesig freuen.</p>`,
    },
    { type: "button", label: "Review schreiben", url: TRUSTPILOT_URL },
    {
      type: "text",
      text: `<p>⭐ <strong>Dein persönliches Feedback</strong></p>
<p>Für ausführliches Feedback, positiv oder kritisch, sind wir jederzeit offen. Schreib direkt an sophia@ephia.de oder marc@ephia.de.</p>`,
    },
    { type: "button", label: "Feedback senden", url: FEEDBACK_MAILTO },
    {
      type: "text",
      text: `<p>📣 <strong>Folge uns auf Instagram</strong></p>
<p>Neue Kurse, Fachbeiträge und Aktionen siehst Du dort zuerst.</p>`,
    },
    { type: "button", label: "Auf Instagram folgen", url: INSTAGRAM_URL },
  ];

  return buildEmailHtml({
    firstName,
    contentBlocks: blocks,
  });
}
