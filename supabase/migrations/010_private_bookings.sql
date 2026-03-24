ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type text DEFAULT 'standard';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS referring_doctor text;

-- Update the create_encrypted_booking function to accept new params
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
  v_booked int;
  v_booking_id uuid;
BEGIN
  SELECT capacity INTO v_capacity
  FROM slots WHERE id = p_slot_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SLOT_NOT_FOUND';
  END IF;

  SELECT count(*) INTO v_booked
  FROM bookings
  WHERE slot_id = p_slot_id AND status IN ('booked', 'attended');

  IF v_booked >= v_capacity THEN
    RAISE EXCEPTION 'SLOT_FULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE slot_id = p_slot_id AND email_hash = p_email_hash AND status IN ('booked', 'attended')
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
