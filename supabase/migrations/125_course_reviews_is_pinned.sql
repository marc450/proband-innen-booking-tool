-- Allow forcing a specific course_review to the top of the doctor-facing
-- carousels regardless of submitted_at. The reviews query orders by is_pinned
-- DESC first, then submitted_at DESC, so any pinned row floats to position 1.
alter table public.course_reviews
  add column if not exists is_pinned boolean not null default false;

-- Pin the DGBT-comparison review (Andrea) per Marc's request.
update public.course_reviews
set is_pinned = true
where id = 'f44d91ce-9d10-4b0b-a089-3634f7096235';
