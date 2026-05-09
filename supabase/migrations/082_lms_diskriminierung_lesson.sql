-- 082_lms_diskriminierung_lesson.sql
-- Add the second lesson in chapter 2: "Diskriminierung in der
-- ästhetischen Medizin". Long text-only lesson with two
-- "Frage Dich selbst" rose callouts, four H3 sections, a closing
-- summaryBand, an H2 + a citation-variant orderedList for the
-- Literaturverzeichnis.
--
-- Renderer support added in src/lib/lms/renderer.tsx:
--   * orderedList.attrs.variant = "citations" → smaller, denser
--     numbered list for academic references.
--   * Callout children now get vertical spacing between paragraphs.
--
-- Two em-dashes in the body prose were replaced with commas per the
-- brand rule "no em/en dashes as sentence punctuation in user-facing
-- copy". The duplicated Hofmann entry in the Literaturverzeichnis was
-- deduplicated to a single citation.

BEGIN;

WITH ch AS (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'schoenheitsideale-und-hintergruende'
)
INSERT INTO public.lms_lessons
  (chapter_id, slug, title, lesson_type, duration_seconds, body, order_index, is_published)
SELECT
  ch.id,
  'diskriminierung-in-der-aesthetischen-medizin',
  'Diskriminierung in der ästhetischen Medizin',
  'text',
  367,
  $json${
    "type": "doc",
    "content": [
      {
        "type": "heading",
        "attrs": { "level": 3, "variant": "brown1" },
        "content": [{ "type": "text", "text": "Der schmale Grat zwischen Ästhetik und Diskriminierung: Eine notwendige Diskussion" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Stell Dir vor, Du betrittst einen Raum voller Menschen, die Du nicht kennst. Wie reagierst Du spontan auf die Personen in diesem Raum, wenn Du keinerlei Hintergrundinformationen über sie hast?" }]
      },
      {
        "type": "callout",
        "attrs": { "variant": "rose" },
        "content": [
          { "type": "paragraph", "content": [{ "type": "text", "text": "Frage Dich selbst:" }] },
          { "type": "paragraph", "content": [{ "type": "text", "text": "Welche Gedanken kommen Dir sofort in den Kopf? Beurteile ich Menschen auf den ersten Blick nach ihrem Aussehen, ihrer Kleidung, ihrem Geschlecht oder ihrer Hautfarbe?" }] }
        ]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Du bist in einem Café und wirst von einer Person anderer ethnischer Herkunft bedient." }]
      },
      {
        "type": "callout",
        "attrs": { "variant": "rose" },
        "content": [
          { "type": "paragraph", "content": [{ "type": "text", "text": "Frage Dich selbst:" }] },
          { "type": "paragraph", "content": [{ "type": "text", "text": "Erwarte ich von dieser Person etwas anderes, als ich es von jemandem erwarten würde, der mir ähnlicher ist? Behandle ich diese Person anders, wenn sie eine andere ethnische Herkunft, Religion, Geschlechtsidentität oder sexuelle Orientierung hat als ich? Wenn ja, wie?" }] }
        ]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "In der ästhetischen Medizin spielen Diskriminierung und Ungerechtigkeit eine große Rolle. Sie zeigen sich in verschiedenen Formen: Von rassistischen Vorurteilen über sozioökonomische Unterschiede bis hin zu den Auswirkungen gesellschaftlicher Schönheitsideale auf den Zugang zu Behandlungen und die Erfahrungen der Patient:innen." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Hofmann(8) führte den Begriff der „ästhetischen Ungerechtigkeit\" ein. Er beschreibt damit die unfaire Behandlung von Menschen aufgrund ihres Aussehens, die sich in Diskriminierung, Stigmatisierung und Ausgrenzung manifestiert. Dieses Konzept zeigt, wie gesellschaftliche Schönheitsnormen zur Benachteiligung führen können. Das wirkt sich nicht nur auf das psychische Wohlbefinden der Betroffenen aus, sondern auch auf ihren Zugang zu medizinischen (und auch ästhetischen) Dienstleistungen." }]
      },
      {
        "type": "heading",
        "attrs": { "level": 3 },
        "content": [{ "type": "text", "text": "Ethnische Diskriminierung" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Besonders in der ästhetischen Medizin ist die Diskriminierung aufgrund von Ethnie ein großes Problem. Akintilo et al.(1) betonen, dass viele klinische Studien zur kosmetischen Medizin keine ethnischen Daten erfassen. Das führt dazu, dass Behandlungen nicht an die besonderen Bedürfnisse von Menschen mit dunkler Hautfarbe (People of Colour / PoC) angepasst sind. Der Mangel an Forschung und Repräsentation führt dazu, dass Patient:innen oft nicht die gleiche Behandlungsqualität und die gleichen Ergebnisse erhalten wie weiße Patient:innen(2, 3)." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Ein Mangel an Inklusion in der Forschung hält immer noch eine gesundheitliche Ungleichheiten aufrecht, was eine direkte Herausforderung für medizinisches Personal darstellt, weil Evidenz für eine gleichberechtigte Behandlung fehlt." }]
      },
      {
        "type": "heading",
        "attrs": { "level": 3 },
        "content": [{ "type": "text", "text": "Jenseits der Jugend: Ästhetische Medizin und der Umgang mit Altersdiskriminierung" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "In der ästhetischen Medizin werden wir täglich mit Altersdiskriminierung konfrontiert. Es geht nicht nur um das „junge und schöne\" Aussehen, sondern auch um den Druck, der auf älteren Menschen lastet, sich diesem Ideal anzupassen. Die Gesellschaft hat klare Vorstellungen davon, was als schön gilt, und das hängt oft mit Jugend zusammen. Für viele ältere Patient:innen führt das dazu, dass sie sich durch die vorherrschenden Schönheitsnormen unzulänglich fühlen." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Dieser Druck kann Menschen dazu treiben, ästhetische Eingriffe nur aus dem Wunsch heraus vorzunehmen, einem bestimmten Ideal zu entsprechen, und nicht unbedingt, weil sie es intrinsisch wollen. Besonders in der Altersgruppe der 25- bis 34-Jährigen sind Eingriffe, die sich an sozialen Idealen orientieren, am häufigsten, vor allem bei Frauen und Menschen mit höherer Bildung(5)." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Doch das geht weit über Äußerlichkeiten hinaus: Studien zeigen, dass diese Art der Altersdiskriminierung erhebliche psychosoziale Folgen haben kann. Ältere Menschen erleben damit ein geringeres Selbstwertgefühl und erleben, gesellschaftlich nicht mehr akzeptiert zu sein(6)." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Darüber hinaus hat die ästhetische Medizin einen tiefgreifenden Einfluss auf die Lebensqualität eines Menschen. Studien haben gezeigt, dass ästhetische Verfahren die psychische Gesundheit und das allgemeine Wohlbefinden verbessern können, was darauf hindeutet, dass diese Behandlungen nicht nur oberflächlich sind, sondern eine entscheidende Rolle bei der Verbesserung der Selbstwahrnehmung und der sozialen Interaktion spielen können(7). Das unterstreicht Deine Bedeutung als Ärzt:in in der Arzt-Patient:innen-Beziehung. Du begleitest Deine Patient:innen oft über Jahre im engen Miteinander." }]
      },
      {
        "type": "heading",
        "attrs": { "level": 3 },
        "content": [{ "type": "text", "text": "Bin ich diskriminierend?" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Es ist natürlich, dass wir unbewusst auf bestimmte Signale und Erscheinungen reagieren, aber hier ist der kritische Punkt:" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Wie bewusst bist Du Dir dieser unbewussten Entscheidungen? Und: Würdest Du jemanden übersehen oder unterschätzen, weil Du auf den ersten Blick Annahmen getroffen hast?" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Welche Annahmen mache ich sofort über die Menschen? Zum Beispiel: Denke ich bei einer Person in eleganter Kleidung automatisch, dass sie erfolgreich oder kompetent ist? Oder schließe ich von einer leger gekleideten Person auf eine bestimmte berufliche Rolle?" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Diese spontanen Gedanken sind oft das Resultat von unbewussten Stereotypen, die wir im Laufe unseres Lebens angesammelt haben, sei es durch Medien, Erziehung oder unsere sozialen Kreise. Es geht nicht darum, diese Gedanken sofort zu verurteilen, sondern sie bewusst wahrzunehmen. Ethnische Vorurteile, gesellschaftliche Schönheitsideale und wirtschaftliche Ungleichheiten sind miteinander verknüpft. Um diese Herausforderungen zu bewältigen, ist ein ganzheitlicher Ansatz erforderlich." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Bedenke bitte auch, dass über Dich Annahmen getroffen werden. Wie würdest Du Dir denn Ärzt:innen in der ästhetischen Medizin vorstellen? Entspricht Du den Vorstellungen? Was an Dir ist besonders? Wie kann ich meine Einzigartigkeit wahrnehmen und wahren, um mit Persönlichkeit und Einfühlungsvermögen zu behandeln?" }]
      },
      {
        "type": "summaryBand",
        "attrs": { "variant": "signal" },
        "content": [
          { "type": "heading", "attrs": { "level": 3 }, "content": [{ "type": "text", "text": "Nach diesem Kapitel weiß ich, dass ..." }] },
          { "type": "paragraph", "content": [{ "type": "text", "text": "Hier findest Du eine Zusammenfassung mit den wichtigsten Punkten aus diesem Kapitel:" }] },
          { "type": "summaryCard", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "wir manchmal gar kein Gefühl dafür haben, welche Diskriminierung Menschen erlebt haben." }] }] },
          { "type": "summaryCard", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Diskriminierung ein Grund sein kann, medizinische Leistungen nicht in Anspruch zu nehmen." }] }] },
          { "type": "summaryCard", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "wir unterbewusst Vorverurteilungen unterliegen und wir uns regelmäßig hinterfragen müssen." }] }] }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "Literaturverzeichnis" }]
      },
      {
        "type": "orderedList",
        "attrs": { "variant": "citations" },
        "content": [
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Akintilo, L., Pulavarty, A., Onwudiwe, O., Garibyan, L., & Lee, K. (2022). Skin of color representation in cosmetic clinical trials: a literature review. Lasers in Surgery and Medicine, 54(6), 819-822. " },
                  { "type": "text", "text": "https://doi.org/10.1002/lsm.23546", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.1002/lsm.23546" } }] }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Dehon, E., Weiss, N., Jones, J., Faulconer, W., Hinton, E., & Sterling, S. (2017). A systematic review of the impact of physician implicit racial bias on clinical decision making. Academic Emergency Medicine, 24(8), 895-904. " },
                  { "type": "text", "text": "https://doi.org/10.1111/acem.13214", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.1111/acem.13214" } }] }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Blair, I., Steiner, J., Fairclough, D., Hanratty, R., Price, D., Hirsh, H., … & Havranek, E. (2013). Clinicians' implicit ethnic/racial bias and perceptions of care among black and latino patients. The Annals of Family Medicine, 11(1), 43-52. " },
                  { "type": "text", "text": "https://doi.org/10.1370/afm.1442", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.1370/afm.1442" } }] }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Hagiwara, N., Penner, L., Gonzalez, R., Eggly, S., Dovidio, J., Gaertner, S., … & Albrecht, T. (2013). Racial attitudes, physician–patient talk time ratio, and adherence in racially discordant medical interactions. Social Science & Medicine, 87, 123-131. " },
                  { "type": "text", "text": "https://doi.org/10.1016/j.socscimed.2013.03.016", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.1016/j.socscimed.2013.03.016" } }] }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Alsatti, H. (2023). The impact of social media on seeking dermatological care. Cureus. " },
                  { "type": "text", "text": "https://doi.org/10.7759/cureus.49941", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.7759/cureus.49941" } }] }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Karwańska, A., Kulbat, A., Matyka, K., Uniłowska, I., Kojder, E., Dolenha, A., … & Szymczyk, A. (2023). The impact of aesthetic medicine procedures on patient comfort in life, physical activity and mental health. Journal of Education, Health and Sport, 14(1), 20-26. " },
                  { "type": "text", "text": "https://doi.org/10.12775/jehs.2023.14.01.002", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.12775/jehs.2023.14.01.002" } }] }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Cotofana, S., Sattler, S., Frank, K., Hernandez, C. A., Pavicic, T., Green, J. B., … & Pooth, R. M. (2022). Aesthetic medicine—quo vadis?. Journal of Cosmetic Dermatology, 21(11), 6526-6527. " },
                  { "type": "text", "text": "https://doi.org/10.1111/jocd.15334", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.1111/jocd.15334" } }] }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  { "type": "text", "text": "Hofmann, B. (2023). Aesthetic injustice. Journal of Business Ethics, 189(2), 217-229. " },
                  { "type": "text", "text": "https://doi.org/10.1007/s10551-023-05401-4", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.1007/s10551-023-05401-4" } }] }
                ]
              }
            ]
          }
        ]
      }
    ]
  }$json$::jsonb,
  1,
  true
FROM ch
ON CONFLICT (chapter_id, slug) DO NOTHING;

COMMIT;
