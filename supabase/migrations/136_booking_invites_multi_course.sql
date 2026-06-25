-- Multi-course invites: one Einladung can now grant access to several
-- courses, redeemed in a single combined Stripe checkout.
--
-- Design: single-course invites keep using the existing flow untouched
-- (template_id / session_id / course_type stay populated, the
-- create_course_booking_with_invite RPC handles them). A multi-course
-- invite leaves those legacy columns NULL and stores its courses in
-- booking_invite_courses. The presence of junction rows is the
-- discriminator between the two flows.

-- The legacy single-course columns must be nullable so a multi-course
-- invite can leave them empty (its courses live in the junction table).
ALTER TABLE public.booking_invites ALTER COLUMN template_id DROP NOT NULL;
ALTER TABLE public.booking_invites ALTER COLUMN course_type DROP NOT NULL;

-- Courses attached to a multi-course invite (>= 2 rows). One row per
-- course/variant/session the doctor may book under this single invite.
CREATE TABLE IF NOT EXISTS public.booking_invite_courses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id    uuid NOT NULL REFERENCES public.booking_invites(id) ON DELETE CASCADE,
  template_id  uuid NOT NULL REFERENCES public.course_templates(id) ON DELETE CASCADE,
  session_id   uuid REFERENCES public.course_sessions(id) ON DELETE SET NULL,
  course_type  text NOT NULL,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_invite_courses_invite_idx   ON public.booking_invite_courses(invite_id);
CREATE INDEX IF NOT EXISTS booking_invite_courses_template_idx ON public.booking_invite_courses(template_id);
CREATE INDEX IF NOT EXISTS booking_invite_courses_session_idx  ON public.booking_invite_courses(session_id);

-- One multi-course invite produces several bookings, so the singular
-- booking_invites.used_by_booking_id can't hold them all. Track each
-- created booking here instead. used_count still gates redemption (one
-- combined checkout = one use).
CREATE TABLE IF NOT EXISTS public.booking_invite_redemptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id   uuid NOT NULL REFERENCES public.booking_invites(id) ON DELETE CASCADE,
  booking_id  uuid NOT NULL REFERENCES public.course_bookings(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_invite_redemptions_invite_idx  ON public.booking_invite_redemptions(invite_id);
CREATE INDEX IF NOT EXISTS booking_invite_redemptions_booking_idx ON public.booking_invite_redemptions(booking_id);

-- Data API access. No PII here (only FKs), so mirror booking_invites:
-- staff (authenticated) and the server-side admin client (service_role).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_invite_courses     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_invite_courses     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_invite_redemptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_invite_redemptions TO service_role;

ALTER TABLE public.booking_invite_courses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_invite_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_invite_courses staff rw" ON public.booking_invite_courses;
CREATE POLICY "booking_invite_courses staff rw" ON public.booking_invite_courses
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "booking_invite_redemptions staff rw" ON public.booking_invite_redemptions;
CREATE POLICY "booking_invite_redemptions staff rw" ON public.booking_invite_redemptions
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
