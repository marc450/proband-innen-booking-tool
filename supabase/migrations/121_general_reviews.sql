-- General (course-agnostic) reviews.
--
-- The one-time bulk review request to past attendees asks for a GENERAL
-- rating of EPHIA, not a rating tied to one specific course. A person who
-- booked several courses gets a single email, and the review they leave is
-- not pinned to any one template. To represent that:
--
--   1. course_reviews.template_id becomes nullable. A null template_id is a
--      general review; the /kurse/[slug] pages already render such reviews
--      in the shared cross-course pool and simply omit the per-card
--      "Bewertung zum Kurs X" label when there is no template.
--   2. course_bookings.review_request_general marks the one representative
--      booking that carried the general-review email, so submit-review knows
--      to write template_id = null instead of the booking's own template.

alter table public.course_reviews
  alter column template_id drop not null;

alter table public.course_bookings
  add column if not exists review_request_general boolean not null default false;

comment on column public.course_bookings.review_request_general is
  'True on the single representative booking that received the one-time GENERAL bulk review-request email. submit-review writes course_reviews.template_id = null for these, so the resulting review is not pinned to any course.';
