-- Step 2 of 3: create_course_booking_with_invite RPC.
-- Same format as 021_seat_adjustment_rpcs.sql so the Supabase dashboard
-- splitter handles it: AS $$ ... $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.create_course_booking_with_invite(
  p_session_id text,
  p_template_id uuid,
  p_course_type text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_stripe_checkout_session_id text,
  p_stripe_customer_id text,
  p_amount_paid integer,
  p_invite_token text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_session_uuid uuid;
  v_max integer;
  v_booked integer;
  v_booking_id uuid;
  v_invite public.booking_invites%ROWTYPE;
BEGIN
  IF p_session_id IS NOT NULL AND p_session_id <> '' THEN
    v_session_uuid := p_session_id::uuid;
  END IF;

  IF p_invite_token IS NOT NULL AND p_invite_token <> '' THEN
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
    IF v_invite.template_id <> p_template_id THEN
      RAISE EXCEPTION 'INVITE_INVALID';
    END IF;
    IF v_invite.course_type <> p_course_type THEN
      RAISE EXCEPTION 'INVITE_INVALID';
    END IF;
    IF v_invite.session_id IS NOT NULL AND v_invite.session_id IS DISTINCT FROM v_session_uuid THEN
      RAISE EXCEPTION 'INVITE_INVALID';
    END IF;

    IF v_session_uuid IS NOT NULL THEN
      SELECT max_seats, booked_seats INTO v_max, v_booked
      FROM public.course_sessions WHERE id = v_session_uuid FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND';
      END IF;
      UPDATE public.course_sessions
         SET booked_seats = booked_seats + 1
       WHERE id = v_session_uuid;
    END IF;

    INSERT INTO public.course_bookings (
      session_id, template_id, course_type,
      first_name, last_name, email, phone,
      stripe_checkout_session_id, stripe_customer_id, amount_paid
    ) VALUES (
      v_session_uuid, p_template_id, p_course_type,
      p_first_name, p_last_name, p_email, p_phone,
      p_stripe_checkout_session_id, p_stripe_customer_id, p_amount_paid
    ) RETURNING id INTO v_booking_id;

    UPDATE public.booking_invites
       SET used_count = used_count + 1,
           used_by_booking_id = COALESCE(used_by_booking_id, v_booking_id),
           used_at = COALESCE(used_at, now())
     WHERE id = v_invite.id;

    RETURN v_booking_id;
  END IF;

  IF v_session_uuid IS NOT NULL THEN
    SELECT max_seats, booked_seats INTO v_max, v_booked
    FROM public.course_sessions WHERE id = v_session_uuid FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'SESSION_NOT_FOUND';
    END IF;
    IF v_booked >= v_max THEN
      RAISE EXCEPTION 'SESSION_FULL';
    END IF;
    UPDATE public.course_sessions
       SET booked_seats = booked_seats + 1
     WHERE id = v_session_uuid;
  END IF;

  INSERT INTO public.course_bookings (
    session_id, template_id, course_type,
    first_name, last_name, email, phone,
    stripe_checkout_session_id, stripe_customer_id, amount_paid
  ) VALUES (
    v_session_uuid, p_template_id, p_course_type,
    p_first_name, p_last_name, p_email, p_phone,
    p_stripe_checkout_session_id, p_stripe_customer_id, p_amount_paid
  ) RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;
