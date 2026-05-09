-- 078_lms_welcome_summary_band.sql
-- Convert the "Was Du mitnehmen wirst" section in the welcome lesson
-- from a heading + paragraph + bulletList trio into a single
-- `summaryBand` node with three `summaryCard` children. Renders as
-- the full-bleed signal-blue section that the LearnWorlds reference
-- uses. Renderer support: src/lib/lms/renderer.tsx.
--
-- Idempotent: re-running just sets the body to the same value.

BEGIN;

UPDATE public.lms_lessons
SET body = $json${
  "type": "doc",
  "content": [
    {
      "type": "callout",
      "attrs": { "variant": "signal" },
      "content": [
        { "type": "paragraph", "content": [{ "type": "text", "text": "Egal, ob Du bereits Erfahrung in der ästhetischen Medizin hast oder gerade erst in diesen spannenden Bereich einsteigst, Du bist bei EPHIA genau richtig. Botulinum ist heute aus der ästhetischen Praxis kaum mehr wegzudenken und gehört zu den am häufigsten durchgeführten Behandlungen weltweit." }] }
      ]
    },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Doch mit dieser hohen Nachfrage kommen auch große Erwartungen an Qualität, Sicherheit und ethische Verantwortung. Wir erleben, dass das Feld der ästhetischen Medizin nicht nur Ärztinnen und Ärzte anzieht, die ihre Patient:innen auf der Reise zu einem selbstbestimmten Äußeren achtungsvoll begleiten möchten, sondern auch Fachkräfte, die ihre monetären Interessen über eine gute ärztliche Praxis stellen. Aus diesem Grund wollen wir gemeinsam mit Dir die Ausbildung in der ästhetischen Medizin anders denken!" }] },
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Was erwartet Dich in diesem kostenfreien Tutorial?" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Die Glabella gehört zu den häufigsten Indikationen in der ästhetischen Medizin für die Behandlung mit Botulinum. Genau hier setzen wir mit unserem kostenfreien Tutorial an. In diesem exklusiven Einblick erhältst Du Zugang zu einem ausgewählten EPHIA Lehrvideo aus unserem Online-Kurs, in dem wir Dir die Wirkweise von Botulinum sowie die wichtigsten theoretischen Grundlagen für die Behandlung dieser Region vorstellen." }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Wir wissen, dass die Literatur über Botulinum Typ A (BoNT-A) umfangreich ist, oft widersprüchlich und durch einen wettbewerbsorientierten Markt für Produkte und Forschung, die versuchen, die Individualität der Marke zu betonen, zusätzlich verkompliziert wird. Daher haben wir verschiedenste Studien und Reviews eingebracht und unser Lehrwissen durch aktuelle wissenschaftliche Fakten untermauert." }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Bitte beachte: In diesem freien Tutorial siehst Du lediglich eines unserer Behandlungsvideos. Im online Grundkurs Botulinum stellen wir Dir mehrere Patient:innen vor, diskutieren unterschiedliche Behandlungsindikationen und vertiefen das Wissen anhand praxisnaher Fallbeispiele." }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Wir können in diesem Tutorial nicht alle anatomischen und praktischen Grundlagen abdecken. Den vollständigen theoretischen Teil, praxisnahe Übungen und die vertiefende Auseinandersetzung mit Indikationen findest Du in unserem online Grundkurs Botulinum. Dort erhältst Du nicht nur Zugang zu allen Modulen, sondern auch zu unserer exklusiven Community, in der wir reale Fälle diskutieren, Hilfestellungen geben und Dich beim Einstieg in die Praxis begleiten. Zusätzlich stellen wir Dir Rechnungsbeispiele und Abrechnungshilfen zur Verfügung, damit Du Deine Leistungen rechtssicher und professionell abrechnen kannst." }] },
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Warum unterrichten wir diskriminierungssensibel?" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Wir könnten ganz einfach sagen: Weil es selbstverständlich ist!" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Aber: Die ästhetische Medizin, insbesondere minimalinvasive Verfahren, boomt. Doch damit drängen immer mehr Ärzt:innen auf den Markt, deren Fokus oft mehr auf den eigenen Interessen als auf den Bedürfnissen der Patient:innen liegt. Wir sind der Meinung: Das darf so nicht bleiben!" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Ästhetische Medizin bedeutet mehr als nur ein gutes technisches Handwerk. Sie hat einen enormen Einfluss auf das Selbstwertgefühl und die Lebensqualität der Patient:innen. Als Behandler:in hast Du die Verantwortung, dass Deine Behandlungen alle Menschen gleichberechtigt erreichen: Unabhängig von Hautfarbe, Herkunft, Alter oder Geschlecht. In diesem Kurs wirst Du daher auch lernen, wie Du Inklusivität und ethische Prinzipien in Deinen Praxisalltag integrieren kannst." }] },
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Wir bleiben neutral!" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Die EPHIA Akademie arbeitet unabhängig und firmenneutral. Wir bevorzugen oder fördern keine bestimmten Hersteller oder Produkte und stehen in keinem wirtschaftlichen Zusammenhang mit Unternehmen der Pharma- oder Medizinprodukteindustrie. Unsere Lehrinhalte basieren ausschließlich auf wissenschaftlichen Erkenntnissen und praxisrelevanten Standards, ohne kommerziellen Einfluss." }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "In unseren Präsenzkursen setzen wir auf die Verwendung von ready-to-use Produkten, da wir den hohen didaktischen Wert dieser Praxis schätzen. Besonders in den Grundlagenkursen reduzieren wir bewusst potenzielle Fehlerquellen, um die Sicherheit der Patient:innen zu gewährleisten und die Teilnehmenden schrittweise an die Anwendung heranzuführen. In den fortgeschrittenen Kursen wird das Spektrum der verwendeten Präparate entsprechend der Indikation erweitert." }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Die Philosophie der EPHIA Akademie ist es, zu Beginn einer ästhetischen Tätigkeit mit einer begrenzten Anzahl an Produkten zu arbeiten, um eine hohe Produktsicherheit zu erlangen und verantwortungsvoll sowie patient:innensicher zu behandeln." }] },
    {
      "type": "summaryBand",
      "attrs": { "variant": "signal" },
      "content": [
        { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "Was Du mitnehmen wirst:" }] },
        { "type": "paragraph", "content": [{ "type": "text", "text": "Am Ende dieses freien Tutorials wirst Du in der Lage sein:" }] },
        { "type": "summaryCard", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "die relevanten Injektionspunkte für die Behandlung der Glabella sicher zu identifizieren" }] }] },
        { "type": "summaryCard", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "die benötigten Einheiten für verschiedene Präparate einzuschätzen" }] }] },
        { "type": "summaryCard", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "die theoretische Wirkweise von Botulinum in dieser Region zu verstehen" }] }] }
      ]
    },
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Verantwortung teilen, Exzellenz leben" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Wir sind überzeugt, dass wir nur so stark sind, wie die Gemeinschaft, die wir zusammen mit Dir aufbauen. Für uns bedeutet Ausbildung mehr als nur Fachwissen zu vermitteln. Es bedeutet, eine Kultur des Lernens und der Offenheit für Fehler zu fördern. Wir erheben keinen Anspruch darauf, immer zu 100% im Recht zu sein. Deshalb laden wir Dich ein, aktiv in den Dialog mit uns zu treten, Dich mit anderen Ärzt:innen auszutauschen und so gemeinsam zu wachsen." }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Indem wir auch unsere eigenen Fehler annehmen und daraus lernen, übernehmen wir Verantwortung: Für uns selbst, für unsere Patient:innen sowie für eine sichere, inklusive ästhetische Versorgung. Denn nur durch ständigen Austausch und Reflektion können wir die Patient:innensicherheit stärken und den Zugang zu unseren Behandlungen fair und gerecht gestalten." }] }
  ]
}$json$::jsonb
WHERE chapter_id = (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'wir-freuen-uns-dass-du-dabei-bist'
)
AND slug = 'herzlich-willkommen';

COMMIT;
