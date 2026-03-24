-- Patients: encryption columns
ALTER TABLE patients ADD COLUMN IF NOT EXISTS encrypted_data text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS encrypted_key text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS encryption_iv text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email_hash text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_hash text;

-- Bookings: encryption columns
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS encrypted_data text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS encrypted_key text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS encryption_iv text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email_hash text;

-- Indexes for hash lookups
CREATE INDEX IF NOT EXISTS idx_patients_email_hash ON patients(email_hash);
CREATE INDEX IF NOT EXISTS idx_patients_phone_hash ON patients(phone_hash);
CREATE INDEX IF NOT EXISTS idx_bookings_email_hash ON bookings(email_hash);

-- RPC for atomic encrypted booking creation (slot locking + capacity check)
CREATE OR REPLACE FUNCTION create_encrypted_booking(
  p_slot_id uuid,
  p_email_hash text,
  p_encrypted_data text,
  p_encrypted_key text,
  p_encryption_iv text,
  p_stripe_checkout_session_id text
) RETURNS uuid AS $$
DECLARE
  v_capacity int;
  v_booked int;
  v_booking_id uuid;
BEGIN
  -- Lock the slot row
  SELECT capacity INTO v_capacity
  FROM slots WHERE id = p_slot_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SLOT_NOT_FOUND';
  END IF;

  -- Count active bookings
  SELECT count(*) INTO v_booked
  FROM bookings
  WHERE slot_id = p_slot_id AND status IN ('booked', 'attended');

  IF v_booked >= v_capacity THEN
    RAISE EXCEPTION 'SLOT_FULL';
  END IF;

  -- Check duplicate by email_hash + slot
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE slot_id = p_slot_id AND email_hash = p_email_hash AND status IN ('booked', 'attended')
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_BOOKING';
  END IF;

  -- Insert encrypted booking
  INSERT INTO bookings (
    slot_id, email_hash, encrypted_data, encrypted_key, encryption_iv,
    stripe_checkout_session_id, status
  ) VALUES (
    p_slot_id, p_email_hash, p_encrypted_data, p_encrypted_key, p_encryption_iv,
    p_stripe_checkout_session_id, 'booked'
  ) RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;
