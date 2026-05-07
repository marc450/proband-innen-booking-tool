-- ============================================================================
-- Native review system (Trustpilot-style) for course bookings.
--
-- Flow:
--   1. After course end (date_iso + start_time + duration_minutes), a daily
--      cron pass schedules a review-request email via Resend's `scheduled_at`,
--      so the email fires within seconds of course end.
--   2. The doctor clicks the tokenized link, lands on /bewertung/[token],
--      submits 1-5 stars, first name, public review text, and optional
--      anonymous internal feedback.
--   3. Reviews land as `is_published = false`. Staff publishes them from
--      /dashboard/auszubildende/bewertungen.
--   4. Public display on /kurse/[slug] is a follow-up.
-- ============================================================================

-- ── Columns on course_bookings ─────────────────────────────────────────────
alter table public.course_bookings
  add column if not exists review_email_resend_id text,
  add column if not exists review_email_sent_at   timestamptz,
  add column if not exists review_submit_token    text unique;

comment on column public.course_bookings.review_email_resend_id is
  'Resend email ID returned when scheduling the review-request email. Used to cancel/reschedule. NULL = not scheduled yet.';
comment on column public.course_bookings.review_email_sent_at is
  'Wall-clock time the review email was sent (Resend fired it). Idempotency marker for the rolling-schedule pass.';
comment on column public.course_bookings.review_submit_token is
  'One-time token embedded in the review email link. Validated by /api/submit-review. NULL until email is scheduled.';

create index if not exists idx_course_bookings_review_token
  on public.course_bookings (review_submit_token)
  where review_submit_token is not null;

-- ── course_reviews table ────────────────────────────────────────────────────
create table if not exists public.course_reviews (
  id                 uuid primary key default gen_random_uuid(),
  booking_id         uuid not null unique references public.course_bookings(id) on delete cascade,
  template_id        uuid not null references public.course_templates(id) on delete cascade,
  rating             smallint not null check (rating between 1 and 5),
  first_name         text not null check (length(trim(first_name)) > 0),
  body_text          text,
  internal_feedback  text,
  is_published       boolean not null default false,
  submitted_at       timestamptz not null default now(),
  published_at       timestamptz,
  created_at         timestamptz not null default now()
);

comment on table public.course_reviews is
  'Doctor reviews of Auszubildende courses. Submitted via tokenized link in post-course email. Always tied to a verified course_booking. body_text is publishable on /kurse/[slug] once is_published flips true; internal_feedback is staff-only.';
comment on column public.course_reviews.body_text is
  'Public review text. Shown next to first_name on the course landing page once is_published.';
comment on column public.course_reviews.internal_feedback is
  'Anonymous feedback for the EPHIA team only. NEVER displayed publicly under any circumstances.';
comment on column public.course_reviews.is_published is
  'Staff moderation flag. Reviews land as false; staff toggles true to surface on the course page.';

create index if not exists idx_course_reviews_template
  on public.course_reviews (template_id, is_published, submitted_at desc);
create index if not exists idx_course_reviews_booking
  on public.course_reviews (booking_id);

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.course_reviews enable row level security;

-- Public reads: only published reviews, only the columns we display.
-- Anon clients still see the row, so internal_feedback is stripped at the
-- API layer (/api/public-reviews) — RLS gives row-level access, not column
-- masking. The publicly served route is what guarantees internal_feedback
-- never leaks. RLS here is a second line of defense.
drop policy if exists course_reviews_public_read on public.course_reviews;
create policy course_reviews_public_read
  on public.course_reviews
  for select
  to anon, authenticated
  using (is_published = true);

-- Service role (admin client) bypasses RLS entirely; used by /api/submit-review
-- for inserts and by the dashboard for moderation. No additional policies
-- needed for staff because every staff path goes through the admin client.
