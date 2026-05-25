-- ============================================================================
-- Allow imported testimonials in course_reviews and seed the 3 long-form
-- testimonials that used to live in the hand-curated Testimonials block
-- on the course landings (Dr. Laura Bergeest, Nadja Geuther, Lawik
-- Revend, all from the original Grundkurs Botulinum cohort).
--
-- Changes:
-- 1. course_reviews.booking_id becomes nullable. Reviews submitted via
--    the post-course email link still always have a booking_id (and the
--    UNIQUE constraint still prevents double-submits per booking — multiple
--    NULLs are allowed by Postgres default UNIQUE semantics).
-- 2. Three optional display columns for imported rows that have no
--    auszubildende join to fall back on. The public page (and admin
--    UI) cascade: auszubildende.title  → display_title, last_name[0]
--    → display_last_initial.
-- 3. `is_imported` flag so the admin tool can tell handpicked
--    historical testimonials apart from organic post-course reviews.
-- ============================================================================

alter table public.course_reviews
  alter column booking_id drop not null,
  add column if not exists display_title         text,
  add column if not exists display_last_initial  text,
  add column if not exists is_imported           boolean not null default false;

comment on column public.course_reviews.booking_id is
  'Nullable for imported/historical testimonials (is_imported=true). Always set for reviews submitted via the post-course email link.';
comment on column public.course_reviews.display_title is
  'Override professional title for rows that have no linked auszubildende (typically is_imported=true). The public landing prefers the auszubildende-derived title and falls back to this.';
comment on column public.course_reviews.display_last_initial is
  'Override last-name initial (single uppercase letter, no dot) for rows that have no linked auszubildende. The public landing prefers the auszubildende-derived initial and falls back to this.';
comment on column public.course_reviews.is_imported is
  'TRUE for testimonials we lifted into the table by hand (no booking, no email-token submission). Lets the admin tool flag them separately and reminds future-us that the body text was author-summarised, not their literal submission.';

-- ── Seed the 3 historical testimonials ────────────────────────────────────
-- Each insert is guarded by NOT EXISTS so this migration is safe to run
-- twice on the same database. The template_id is resolved at insert time
-- from course_templates.course_key so we don't have to hardcode UUIDs.
--
-- body_text is the 3-sentence condensation of the long-form testimonials
-- that used to live in src/content/kurse/grundkurs-botulinum.ts. The
-- originals are preserved in git history.

insert into public.course_reviews (
  booking_id, template_id, rating, first_name, body_text,
  display_title, display_last_initial, is_imported, is_published, published_at
)
select
  null, ct.id, 5, 'Laura',
  'Der Grundkurs Botulinum hat mich sehr überzeugt, vor allem die praktischen Übungen an Proband:innen und die 1:1 Begleitung durch Dr. Sophia. Auch die Erklärung der MD-Codes war sehr aufschlussreich. Für mich ein absolutes Muss für Mediziner:innen, die in die ästhetische Medizin einsteigen wollen.',
  'Dr.', 'B', true, true, now()
from public.course_templates ct
where ct.course_key = 'grundkurs_botulinum'
  and not exists (
    select 1 from public.course_reviews
    where is_imported = true and first_name = 'Laura' and display_last_initial = 'B'
  );

insert into public.course_reviews (
  booking_id, template_id, rating, first_name, body_text,
  display_title, display_last_initial, is_imported, is_published, published_at
)
select
  null, ct.id, 5, 'Nadja',
  'Sophias diverser, individueller Ansatz stellt den Menschen mit seinen eigenen Vorstellungen ins Zentrum, statt vorgefertigte Schemata. Theorie und Praxis sind perfekt kombiniert und mit großer fachlicher Kompetenz kuratiert. Ich bin mit dem selbstbewussten Gefühl gegangen, mein neues Wissen sofort in die Praxis umsetzen zu können.',
  null, 'G', true, true, now()
from public.course_templates ct
where ct.course_key = 'grundkurs_botulinum'
  and not exists (
    select 1 from public.course_reviews
    where is_imported = true and first_name = 'Nadja' and display_last_initial = 'G'
  );

insert into public.course_reviews (
  booking_id, template_id, rating, first_name, body_text,
  display_title, display_last_initial, is_imported, is_published, published_at
)
select
  null, ct.id, 5, 'Lawik',
  'Die detaillierte Erklärung der anatomischen Grundlagen und die praktischen Übungen haben meine Fähigkeiten deutlich verbessert. Besonders hilfreich war die persönliche Betreuung und das Feedback während der Hands-on-Trainings. Selten einen Kurs erlebt, der so gut strukturiert und praxisorientiert war.',
  null, 'R', true, true, now()
from public.course_templates ct
where ct.course_key = 'grundkurs_botulinum'
  and not exists (
    select 1 from public.course_reviews
    where is_imported = true and first_name = 'Lawik' and display_last_initial = 'R'
  );
