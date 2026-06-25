-- Multi-course invite redemption RPC. Mirrors the format of
-- 033b_booking_invites_function.sql (AS $$ ... $$ LANGUAGE plpgsql;) so the
-- Supabase dashboard splitter handles it.
--
-- Validates a multi-course invite once, then creates one course_booking per
-- course passed in p_courses (a JSON array of
-- {session_id, template_id, course_type, amount_paid}). Each course must
-- exist in booking_invite_courses for this invite. Capacity is bypassed for
-- invited seats (booked_seats is incremented without the SESSION_FULL guard),
-- exactly like the single-course invite RPC. used_count is incremented once
-- (one combined checkout = one use). Returns the created booking ids in input
-- order.

CREATE OR REPLACE FUNCTION public.create_course_bookings_with_invite(
  p_invite_token text,
  p_courses jsonb,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_stripe_checkout_session_id text,
  p_stripe_customer_id text
) RETURNS uuid[] AS $$
DECLARE
  v_invite public.booking_invites%ROWTYPE;
  v_course jsonb;
  v_session_uuid uuid;
  v_template_id uuid;
  v_course_type text;
  v_amount integer;
  v_booking_id uuid;
  v_ids uuid[] := '{}';
  v_match integer;
BEGIN
  IF p_invite_token IS NULL OR p_invite_token = '' THEN
    RAISE EXCEPTION 'INVITE_INVALID';
  END IF;

  SELECT * INTO v_invite
  FROM public.booking_invites
  WHERE token = p_invite_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITE_INVALID';
  END IF;
  IF v_invite.revoked THEN
    RAISE EXCEPTION 'INVITE_INVALID';
  END IF;
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'INVITE_INVALID';
  END IF;
  IF v_invite.used_count >= v_invite.max_uses THEN
    RAISE EXCEPTION 'INVITE_INVALID';
  END IF;

  FOR v_course IN SELECT * FROM jsonb_array_elements(p_courses)
  LOOP
    v_template_id := (v_course->>'template_id')::uuid;
    v_course_type := v_course->>'course_type';
    v_amount := COALESCE((v_course->>'amount_paid')::integer, 0);
    IF (v_course->>'session_id') IS NOT NULL AND (v_course->>'session_id') <> '' THEN
      v_session_uuid := (v_course->>'session_id')::uuid;
    ELSE
      v_session_uuid := NULL;
    END IF;

    -- The course must belong to this invite.
    SELECT count(*) INTO v_match
    FROM public.booking_invite_courses
    WHERE invite_id = v_invite.id
      AND template_id = v_template_id
      AND course_type = v_course_type
      AND (session_id IS NOT DISTINCT FROM v_session_uuid);
    IF v_match = 0 THEN
      RAISE EXCEPTION 'INVITE_COURSE_MISMATCH';
    END IF;

    -- Invited seats bypass the capacity guard: increment without checking.
    IF v_session_uuid IS NOT NULL THEN
      UPDATE public.course_sessions
         SET booked_seats = booked_seats + 1
       WHERE id = v_session_uuid;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND';
      END IF;
    END IF;

    INSERT INTO public.course_bookings (
      session_id, template_id, course_type,
      first_name, last_name, email, phone,
      stripe_checkout_session_id, stripe_customer_id, amount_paid
    ) VALUES (
      v_session_uuid, v_template_id, v_course_type,
      p_first_name, p_last_name, p_email, p_phone,
      p_stripe_checkout_session_id, p_stripe_customer_id, v_amount
    ) RETURNING id INTO v_booking_id;

    INSERT INTO public.booking_invite_redemptions (invite_id, booking_id)
    VALUES (v_invite.id, v_booking_id);

    v_ids := array_append(v_ids, v_booking_id);
  END LOOP;

  UPDATE public.booking_invites
     SET used_count = used_count + 1,
         used_by_booking_id = COALESCE(used_by_booking_id, v_ids[1]),
         used_at = COALESCE(used_at, now())
   WHERE id = v_invite.id;

  RETURN v_ids;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.create_course_bookings_with_invite(
  text, jsonb, text, text, text, text, text, text
) TO service_role;
