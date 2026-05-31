-- 122_doctor_anchored_review_requests.sql
-- Move the one-time review-request token from a single course_booking to the
-- doctor (auszubildende). Most doctors in the Ärzt:innen list have no
-- course_bookings row (LearnWorlds enrollees, legacy imports, plain contacts),
-- so a booking-anchored token could never reach them. Anchoring on the doctor
-- lets the one-time "alle Teilnehmer:innen anschreiben" pass cover the full
-- base, with the same exclusions (upcoming course, already reviewed, already
-- emailed).

alter table public.auszubildende
  add column if not exists review_submit_token text,
  add column if not exists review_request_resent_at timestamptz;

-- One-time review link per doctor; partial unique so the many NULLs coexist.
create unique index if not exists auszubildende_review_submit_token_key
  on public.auszubildende (review_submit_token)
  where review_submit_token is not null;

-- A review can now hang off a doctor directly. booking_id is already nullable
-- (imported testimonials, migration 114) and template_id is already nullable
-- for general reviews (migration 121).
alter table public.course_reviews
  add column if not exists auszubildende_id uuid
    references public.auszubildende(id) on delete cascade;

-- At most one general (doctor-anchored) review per doctor.
create unique index if not exists course_reviews_auszubildende_id_key
  on public.course_reviews (auszubildende_id)
  where auszubildende_id is not null;
