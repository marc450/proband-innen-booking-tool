-- CME registration numbers (VNR) for the participation certificate.
--
-- VNR Theorie is stable per course template for the year (the online
-- portion is registered once with LÄK Berlin).
-- VNR Praxis changes per session (each practical run gets its own VNR).
-- Both are stamped onto the rendered certificate PDF at send time.

alter table public.course_templates
  add column if not exists vnr_theorie text;

alter table public.course_sessions
  add column if not exists vnr_praxis text;

comment on column public.course_templates.vnr_theorie is
  'CME registration number (LÄK Berlin) for the online/theory portion of this course. Stable per year.';

comment on column public.course_sessions.vnr_praxis is
  'CME registration number (LÄK Berlin) for this specific practical course session.';
