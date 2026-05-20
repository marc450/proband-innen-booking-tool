-- Therapeutic indication picked by the proband during the booking flow.
--
-- Background: the "Aufbaukurs Botulinum - Therap. Indikationen" course
-- can be booked under one of four indications (masseter, bruxismus,
-- migraene, hyperhidrose). The booking funnel now gates slot selection
-- by indication, and the admin tool needs to surface which one was
-- picked. This column captures that choice atomically alongside the
-- rest of the booking row.
--
-- Notes:
--   • Nullable on purpose. Bookings for cosmetic courses (mimische
--     Falten, Dermalfiller, …) carry NULL. Only Therap. Indikationen
--     bookings populate it.
--   • Plaintext (no E2EE). Consistent with `referring_doctor` and
--     treated as treatment-context metadata rather than identity PII.
--   • Free-text TEXT instead of an enum: pedagogical indication lists
--     drift over time and we want migrations to stay schema-only.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS indication text;

COMMENT ON COLUMN bookings.indication IS
  'Therapeutic indication chosen by the proband for Therap. Indikationen course bookings (one of: masseter, bruxismus, migraene, hyperhidrose). NULL for all other course types.';

-- Extend the atomic booking RPC to write the indication. Drop the old
-- overload first so the new default-only signature is unambiguous.

DROP FUNCTION IF EXISTS create_encrypted_booking(uuid, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION create_encrypted_booking(
  p_slot_id uuid,
  p_email_hash text,
  p_encrypted_data text,
  p_encrypted_key text,
  p_encryption_iv text,
  p_stripe_checkout_session_id text DEFAULT NULL,
  p_booking_type text DEFAULT 'standard',
  p_referring_doctor text DEFAULT NULL,
  p_indication text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_capacity int;
  v_blocked boolean;
  v_course_id uuid;
  v_booked int;
  v_booking_id uuid;
BEGIN
  SELECT capacity, blocked, course_id
    INTO v_capacity, v_blocked, v_course_id
  FROM slots WHERE id = p_slot_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SLOT_NOT_FOUND';
  END IF;

  IF v_blocked THEN
    RAISE EXCEPTION 'SLOT_BLOCKED';
  END IF;

  SELECT count(*) INTO v_booked
  FROM bookings
  WHERE slot_id = p_slot_id AND status IN ('booked', 'attended');

  IF v_booked >= v_capacity THEN
    RAISE EXCEPTION 'SLOT_FULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM bookings b
    JOIN slots s ON s.id = b.slot_id
    WHERE s.course_id = v_course_id
      AND b.email_hash = p_email_hash
      AND b.status IN ('booked', 'attended')
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_BOOKING';
  END IF;

  INSERT INTO bookings (
    slot_id, email_hash, encrypted_data, encrypted_key, encryption_iv,
    stripe_checkout_session_id, status, booking_type, referring_doctor,
    indication
  ) VALUES (
    p_slot_id, p_email_hash, p_encrypted_data, p_encrypted_key, p_encryption_iv,
    p_stripe_checkout_session_id, 'booked', p_booking_type, p_referring_doctor,
    p_indication
  ) RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;
