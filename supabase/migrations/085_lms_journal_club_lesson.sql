-- 085_lms_journal_club_lesson.sql
-- Add the "Journal Club Ästhetik" lesson at order_index 4 in the
-- "Schönheitsideale & Hintergründe" chapter (LW puts it last after
-- the Arzt-Patient:innen-Beziehung lesson which is not yet seeded).
--
-- Layout: bold intro paragraph, then a `bulletList` with variant
-- "book" containing three paper-summary items (each with multiple
-- paragraphs). Closing Literaturverzeichnis with three citations.
--
-- Renderer support added in src/lib/lms/renderer.tsx for bulletList
-- variant "book" — open-book icon prefix, multi-paragraph items.
--
-- Editorial cleanup applied to the source text:
--   * em-dashes around appositives replaced with commas / colon
--     (brand rule: no em/en dashes as sentence punctuation).
--   * "*innen" gender markers normalised to ":innen" so the colon
--     style is used consistently (Verbraucher:innen, Dermatolog:innen,
--     Künstler:innen, Patient:innen).

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
  'journal-club-aesthetik',
  'Journal Club Ästhetik',
  'text',
  168,
  $json${
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "In dieser Session fassen wir Dir aktuelle und spannende Paper zu Ästhetik und ästhetischen Wahrnehmung zusammen.", "marks": [{ "type": "bold" }] }
        ]
      },
      {
        "type": "bulletList",
        "attrs": { "variant": "book" },
        "content": [
          {
            "type": "listItem",
            "content": [
              { "type": "paragraph", "content": [{ "type": "text", "text": "Die COVID-19-Pandemie hat das Kaufverhalten im Schönheitsmarkt grundlegend verändert und zu einer Neuausrichtung von Konsumgewohnheiten geführt. Eine Literaturübersicht von Ma und Kwon (1) beleuchtet diese Verschiebungen und zeigt, dass insbesondere der Online-Kauf von Schönheitsprodukten während der Pandemie stark zugenommen hat. Diese Entwicklung ist nicht nur auf die physischen Einschränkungen des Einzelhandels zurückzuführen, sondern spiegelt auch eine verstärkte Nutzung digitaler Plattformen und Technologien wider." }] },
              { "type": "paragraph", "content": [{ "type": "text", "text": "Die Pandemie beeinflusste zudem die Werte und Prioritäten der Verbraucher:innen. Viele legten mehr Wert auf Selbstpflege und Produkte, die Wellness, Hygiene und Gesundheit fördern. Gleichzeitig veränderten sich die sozialen und beruflichen Anforderungen, beispielsweise durch Homeoffice und Maskenpflicht, was die Nachfrage nach spezifischen Produkten wie Hautpflege gegenüber dekorativer Kosmetik verstärkte." }] }
            ]
          },
          {
            "type": "listItem",
            "content": [
              { "type": "paragraph", "content": [{ "type": "text", "text": "Hormone spielen eine zentrale Rolle bei altersbedingten ästhetischen Veränderungen. In der postmenopausalen Phase führen sinkende Hormonspiegel häufig zu unerwünschten Veränderungen wie Gewichtszunahme, Fettverlagerung, gealterter Haut und Haarausfall. Hormontherapien können diese Effekte möglicherweise verhindern oder umkehren. Der Artikel von Barr et. al. (2) beleuchtet die Bedeutung von Östrogen, Progesteron, Testosteron, Dehydroepiandrosteron und Melatonin in Bezug auf die weibliche Ästhetik. Auf Basis aktueller Studienlage wird gezeigt, wie Dermatolog:innen diese Hormone sicher und effektiv in Behandlungsansätze zur ästhetischen Verjüngung integrieren können." }] }
            ]
          },
          {
            "type": "listItem",
            "content": [
              { "type": "paragraph", "content": [{ "type": "text", "text": "Kunst und Medizin: eine spannende Schnittstelle, die zeigt, wie unsere Wahrnehmung von Ästhetik durch das Zusammenspiel von Gehirn und Körper geprägt wird. Eine aktuelle Studie (3) beleuchtet, wie motorische Systeme unsere Wertschätzung von Kunst beeinflussen können. Überraschenderweise werden selbst statische, abstrakte Gemälde, wie die von Jackson Pollock oder Piet Mondrian, mit Aktivierungen in motorischen Hirnregionen in Verbindung gebracht. Bisher wurde angenommen, dass dies mit der Simulation der Bewegungen von Künstler:innen oder Annäherungs- und Vermeidungsreaktionen auf Kunstwerke zusammenhängt." }] },
              { "type": "paragraph", "content": [{ "type": "text", "text": "Was passiert aber, wenn diese motorischen Funktionen verändert sind? Eine Untersuchung mit Parkinson-Patient:innen lieferte spannende Antworten. Während diese Patient:innen stabile Vorlieben für abstrakte Kunst zeigten, nahmen sie die Bewegung in Gemälden, unabhängig vom dargestellten Bewegungsgehalt, weniger intensiv wahr als gesunde Kontrollpersonen. Gleichzeitig zeigte sich bei ihnen eine stärkere Präferenz für Kunstwerke mit hohem Bewegungsanteil, was darauf hinweist, dass das motorische System nicht nur Bewegungen simuliert, sondern auch eine Schlüsselrolle bei der Verarbeitung von Bewegung in der Kunst spielt." }] },
              { "type": "paragraph", "content": [{ "type": "text", "text": "Die Erkenntnisse sind nicht nur faszinierend, sondern auch relevant für die ästhetische Medizin: Sie zeigen, wie wichtig es ist, die individuellen Wahrnehmungsmechanismen und neurologischen Hintergründe unserer Patient:innen zu verstehen. Kunst und Medizin erinnern uns daran, wie tiefgreifend unser Nervensystem unsere Wahrnehmung und unsere Interaktion mit der Welt beeinflusst." }] }
            ]
          }
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
                  { "type": "text", "text": "Ma Y, Kwon KH. Changes in purchasing patterns in the beauty market due to Post-COVID-19: Literature review. J Cosmet Dermatol. 2021 Oct;20(10):3074-3079. doi: 10.1111/jocd.14357. Epub 2021 Oct 10. PMID: 34632711; PMCID: PMC8662129. " },
                  { "type": "text", "text": "https://doi.org/10.1111/jocd.14357", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.1111/jocd.14357" } }] }
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
                  { "type": "text", "text": "Barr K, Kurtti A, Jagdeo J. The Role of Hormone Therapy in Female Aesthetic Rejuvenation. J Drugs Dermatol. 2022 Sep 1;21(9):954-960. doi: 10.36849/JDD.6232. PMID: 36074510. " },
                  { "type": "text", "text": "https://doi.org/10.36849/JDD.6232", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.36849/JDD.6232" } }] }
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
                  { "type": "text", "text": "Humphries S, Rick J, Weintraub D, Chatterjee A. Movement in Aesthetic Experiences: What We Can Learn from Parkinson Disease. J Cogn Neurosci. 2021 Jun 1;33(7):1329-1342. doi: 10.1162/jocn_a_01718. PMID: 34496397; PMCID: PMC8925865. " },
                  { "type": "text", "text": "https://doi.org/10.1162/jocn_a_01718", "marks": [{ "type": "link", "attrs": { "href": "https://doi.org/10.1162/jocn_a_01718" } }] }
                ]
              }
            ]
          }
        ]
      }
    ]
  }$json$::jsonb,
  4,
  true
FROM ch
ON CONFLICT (chapter_id, slug) DO NOTHING;

COMMIT;
