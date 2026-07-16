-- The QuizBlock result-screen defaults went course-neutral (many
-- different courses now share the component). This pins the tailored
-- Grundkurs Botulinum copy + CTA onto the one live funnel that relied
-- on the old hardcoded defaults: the free Botox tutorial test lesson
-- ("mache-jetzt-den-test"). The quiz node sits at content index 2
-- (heading, paragraph, quiz), same path migration 095 used.
--
-- Data-only, idempotent (re-running re-sets the same values). No new
-- table, so no GRANTs needed.

BEGIN;

UPDATE public.lms_lessons AS l
SET body = jsonb_set(
  l.body,
  '{content,2,attrs}',
  (l.body #> '{content,2,attrs}') || $patch${
    "successBody": "Wenn Du Dein Wissen jetzt in die Praxis bringen willst: im EPHIA Online-Grundkurs Botulinum lernst Du Anatomie, Indikationen, Technik und Komplikationsmanagement systematisch und mit echten Fallbeispielen.",
    "failTitle": "Knapp daneben. Botulinum verzeiht keine Annahmen.",
    "failBody": "Im EPHIA Online-Grundkurs Botulinum lernst Du Anatomie, Indikationen und Technik so präzise, dass beim nächsten Versuch hier nichts mehr daneben geht. Versprochen.",
    "ctaLabel": "Zum Grundkurs Botulinum"
  }$patch$::jsonb
)
WHERE l.slug = 'mache-jetzt-den-test'
  AND l.body #> '{content,2,type}' = '"quiz"'::jsonb;

COMMIT;
