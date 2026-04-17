-- Step 1 of 3: booking_invites table + indexes + RLS policy.

CREATE TABLE IF NOT EXISTS public.booking_invites (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token                     text UNIQUE NOT NULL,
  template_id               uuid NOT NULL REFERENCES public.course_templates(id) ON DELETE CASCADE,
  session_id                uuid REFERENCES public.course_sessions(id) ON DELETE SET NULL,
  course_type               text NOT NULL,
  stripe_promotion_code_id  text,
  recipient_email           text,
  recipient_name            text,
  admin_note                text,
  max_uses                  integer NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  used_count                integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  used_by_booking_id        uuid REFERENCES public.course_bookings(id) ON DELETE SET NULL,
  used_at                   timestamptz,
  expires_at                timestamptz,
  revoked                   boolean NOT NULL DEFAULT false,
  created_at                timestamptz NOT NULL DEFAULT now(),
  created_by                uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS booking_invites_token_idx    ON public.booking_invites(token);
CREATE INDEX IF NOT EXISTS booking_invites_template_idx ON public.booking_invites(template_id);
CREATE INDEX IF NOT EXISTS booking_invites_session_idx  ON public.booking_invites(session_id);

ALTER TABLE public.booking_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_invites staff rw" ON public.booking_invites;
CREATE POLICY "booking_invites staff rw" ON public.booking_invites
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
