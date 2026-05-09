-- Per-course duplicate check on booking creation.
--
-- Until now, create_encrypted_booking() only rejected duplicates within
-- the SAME slot, so the same Proband:in could book multiple time-slots
-- of the same course (e.g. 19:20 and 19:40 of the same Saturday session)
-- as long as each slot row was distinct. We've seen this happen in
-- practice via Slack notifications.
--
-- Widen the dedup check to "any booking with the same email_hash on
-- ANY slot belonging to the same course as the requested slot". The
-- pre-flight check at /api/check-booking-eligibility already enforces
-- this; this migration brings the atomic RPC into line so the dedup
-- is race-safe (two checkout sessions completing at the same time
-- can't both pass the pre-flight and then both create bookings).
--
-- Behaviour preserved:
--   • SLOT_NOT_FOUND, SLOT_BLOCKED, SLOT_FULL still raised first.
--   • DUPLICATE_BOOKING raised when same email_hash already has a
--     booked/attended booking on any slot of the same course.
--   • Cancelled bookings are excluded so a Proband:in who cancelled
--     can rebook freely (matches the existing behaviour).

CREATE OR REPLACE FUNCTION create_encrypted_booking(
  p_slot_id uuid,
  p_email_hash text,
  p_encrypted_data text,
  p_encrypted_key text,
  p_encryption_iv text,
  p_stripe_checkout_session_id text DEFAULT NULL,
  p_booking_type text DEFAULT 'standard',
  p_referring_doctor text DEFAULT NULL
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

  -- Per-course dedup (was per-slot). Walks bookings → slots and
  -- rejects if the same email_hash has any active booking on any slot
  -- of v_course_id.
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
    stripe_checkout_session_id, status, booking_type, referring_doctor
  ) VALUES (
    p_slot_id, p_email_hash, p_encrypted_data, p_encrypted_key, p_encryption_iv,
    p_stripe_checkout_session_id, 'booked', p_booking_type, p_referring_doctor
  ) RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;
