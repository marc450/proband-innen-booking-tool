-- 091_lms_chapter4_grundkurs_quiz.sql
-- Add chapter 4 "Lerne mehr über Botulinumbehandlungen!" with two
-- lessons:
--   * order_index 0: EPHIA Grundkurs Botulinum (CTA / promo lesson)
--   * order_index 1: Mache jetzt den Test (interactive quiz)
--
-- Renderer support:
--   * `ctaButton` node — big signal-blue CTA button (lucide ArrowRight).
--   * `quiz` node — 5-question interactive quiz with 30s/question
--      timer, locked answers, perfect-score coupon reveal.
--
-- ⚠ Marc:
-- 1. Verify the correct-answer flags ("correct": true) on each
--    question. They're my best guess based on the lesson content.
-- 2. Create the 5% promo code in Stripe with `code = TUTORIAL5`
--    (or change the value below to whatever code you set).

BEGIN;

-- Chapter 4.
WITH c AS (
  SELECT id FROM public.lms_courses WHERE slug = 'kostenloses-botox-tutorial'
)
INSERT INTO public.lms_chapters
  (course_id, slug, title, order_index, is_published)
SELECT c.id, 'lerne-mehr-ueber-botulinumbehandlungen', 'Lerne mehr über Botulinumbehandlungen!', 3, true FROM c
ON CONFLICT (course_id, slug) DO NOTHING;

-- Lesson 4.1: Grundkurs Botulinum CTA / promo page.
WITH ch AS (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'lerne-mehr-ueber-botulinumbehandlungen'
)
INSERT INTO public.lms_lessons
  (chapter_id, slug, title, lesson_type, duration_seconds, body, order_index, is_published)
SELECT
  ch.id,
  'ephia-grundkurs-botulinum',
  'EPHIA Grundkurs Botulinum',
  'text',
  120,
  $json${
    "type": "doc",
    "content": [
      {
        "type": "heading",
        "attrs": { "level": 3, "variant": "brown1" },
        "content": [{ "type": "text", "text": "Vom ersten Tutorial zur eigenen Praxis." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Du hast gerade die Grundlagen der Glabellabehandlung kennengelernt. Wenn Du die ästhetische Medizin systematisch lernen möchtest, ist unser Grundkurs Botulinum der nächste Schritt. Praxisnah, evidenzbasiert und ausschliesslich für approbierte Ärzt:innen." }]
      },
      {
        "type": "callout",
        "attrs": { "variant": "signal" },
        "content": [
          { "type": "paragraph", "content": [{ "type": "text", "text": "Dein sicherer Einstieg in die ästhetische Medizin: Praxisnah, fundiert und mit echten Proband:innen." }] }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 3 },
        "content": [{ "type": "text", "text": "Nach dem Grundkurs kannst Du ..." }]
      },
      {
        "type": "bulletList",
        "attrs": { "variant": "check" },
        "content": [
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "die Anatomie der mimischen Muskulatur sicher beurteilen." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Indikationen, Kontraindikationen und sensible Patient:innenberatung souverän führen." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "verschiedene Botulinum-Präparate, ihre Aufbereitung und Unterschiede einordnen." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "diskriminierungssensibel kommunizieren und patient:innenzentriert handeln." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "die Injektionstechnik präzise auf individuelle Anatomie anpassen." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Komplikationen erkennen und sicher managen." }] }] }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 3 },
        "content": [{ "type": "text", "text": "Was Du im Grundkurs bekommst" }]
      },
      {
        "type": "summaryBand",
        "attrs": { "variant": "signal" },
        "content": [
          { "type": "paragraph", "content": [{ "type": "text", "text": "Drei Formate, ein Curriculum:" }] },
          { "type": "summaryCard", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "10h Online-Kurs mit praxisnahen Fallbeispielen, anatomischen Grundlagen, Indikationen und Komplikationsmanagement." }] }] },
          { "type": "summaryCard", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "6h Präsenzkurs an echten Proband:innen unter Aufsicht erfahrener Dozent:innen." }] }] },
          { "type": "summaryCard", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "22 CME-Punkte und ein EPHIA-Zertifikat. Über 300 Ärzt:innen haben den Kurs bereits absolviert." }] }] }
        ]
      },
      {
        "type": "ctaButton",
        "attrs": {
          "label": "Zum Grundkurs Botulinum",
          "href": "https://ephia.de/grundkurs-botulinum"
        }
      }
    ]
  }$json$::jsonb,
  0,
  true
FROM ch
ON CONFLICT (chapter_id, slug) DO NOTHING;

-- Lesson 4.2: Mache jetzt den Test (Quiz).
WITH ch AS (
  SELECT ch.id FROM public.lms_chapters ch
  JOIN public.lms_courses co ON co.id = ch.course_id
  WHERE co.slug = 'kostenloses-botox-tutorial'
    AND ch.slug = 'lerne-mehr-ueber-botulinumbehandlungen'
)
INSERT INTO public.lms_lessons
  (chapter_id, slug, title, lesson_type, duration_seconds, body, order_index, is_published)
SELECT
  ch.id,
  'mache-jetzt-den-test',
  'Mache jetzt den Test',
  'text',
  150,
  $json${
    "type": "doc",
    "content": [
      {
        "type": "heading",
        "attrs": { "level": 3, "variant": "brown1" },
        "content": [{ "type": "text", "text": "Wie viel ist hängengeblieben?" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Fünf Fragen zum gerade Gelernten. Beantwortest Du alle richtig, bekommst Du einen 5% Gutschein für den Grundkurs Botulinum." }]
      },
      {
        "type": "quiz",
        "attrs": {
          "passCouponCode": "TUTORIAL5",
          "grundkursUrl": "https://ephia.de/grundkurs-botulinum",
          "timePerQuestionSeconds": 30,
          "questions": [
            {
              "question": "Welcher Botulinum-Typ wird am häufigsten in der ästhetischen Medizin verwendet?",
              "options": [
                { "text": "Botulinum Typ-A", "correct": true },
                { "text": "Botulinum Typ-B", "correct": false },
                { "text": "Botulinum Typ-C", "correct": false },
                { "text": "Botulinum Typ-E", "correct": false }
              ]
            },
            {
              "question": "Welche der folgenden Aussagen zur mimischen Muskulatur des Gesichts ist korrekt?",
              "options": [
                { "text": "Die mimische Muskulatur hat einen knöchernen Ursprung und Ansatz.", "correct": false },
                { "text": "Motorische Endplatten sind bei mimischer Muskulatur zentral angeordnet.", "correct": false },
                { "text": "Die mimische Muskulatur inseriert oft in der Haut oder in benachbarten Muskeln.", "correct": true },
                { "text": "Die mimische Muskulatur ist ausschliesslich für nonverbale Kommunikation zuständig.", "correct": false },
                { "text": "Die mimische Muskulatur ist von Faszien vollständig bedeckt.", "correct": false }
              ]
            },
            {
              "question": "Was charakterisiert die altersbedingten Veränderungen des Platysmas am stärksten?",
              "options": [
                { "text": "Zunahme der Muskelmasse und Spannkraft.", "correct": false },
                { "text": "Ausbildung von vertikalen Bändern durch Lockerung der Hautanheftung.", "correct": true },
                { "text": "Die Bildung von Fettdepots oberhalb des Platysmas.", "correct": false },
                { "text": "Eine Verdickung des Muskels durch erhöhte Muskelaktivität.", "correct": false },
                { "text": "Eine vollständige Degeneration des Muskels.", "correct": false }
              ]
            },
            {
              "question": "Welche Hautmerkmale sind typischerweise bei Menschen mit dunklerer Hautfarbe / Skin of Color zu beachten?",
              "options": [
                { "text": "Dünnere Dermis und weniger Kollagen.", "correct": false },
                { "text": "Geringere Anfälligkeit für Hyperpigmentierung.", "correct": false },
                { "text": "Mehr Faltenbildung und schnellerer Volumenverlust.", "correct": false },
                { "text": "Weniger Talgproduktion und trockene Hautstruktur.", "correct": false },
                { "text": "Höhere Kollagendichte und stärkere Bindung an das darunterliegende Gewebe.", "correct": true }
              ]
            },
            {
              "question": "Wie sollte die Technik in der Regel der Injektion in der Stirnregion durchgeführt werden?",
              "options": [
                { "text": "Flächig subkutan bevorzugt injizieren.", "correct": false },
                { "text": "Zentral injizieren, da die lateralen Bereiche keine Muskelaktivität aufweisen.", "correct": false },
                { "text": "Möglichst nah an der Augenbraue injizieren, um eine maximale Wirkung zu erzielen.", "correct": false },
                { "text": "Injektionen in einem Abstand von etwa 1,5-2 cm setzen.", "correct": true },
                { "text": "Medial mehr Einheiten als lateral verwenden.", "correct": false }
              ]
            }
          ]
        }
      }
    ]
  }$json$::jsonb,
  1,
  true
FROM ch
ON CONFLICT (chapter_id, slug) DO NOTHING;

COMMIT;
