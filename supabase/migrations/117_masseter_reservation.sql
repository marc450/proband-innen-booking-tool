-- Masseter reservation in Grundkurs Botulinum proband slots.
--
-- Background: when a Zahnmediziner:in attends a Grundkurs Botulinum
-- course, they need a masseter proband (a patient on whom they practice
-- masseter/bruxismus treatment, which is within dental scope). If the
-- proband slots of that course fill up with general probands, there is
-- no room left to seat the dentist's masseter proband.
--
-- Solution: each masseter-eligible slot carries a `masseter_capacity`
-- portion of its seats that is held for masseter bookings (indication =
-- 'masseter') and is NOT bookable by general probands. The reserved
-- seats are immediately bookable by Masseterproband:innen.
--
-- Two levers:
--   1. Baseline: an admin marks the later (but not the two latest)
--      slots of a Botulinum course as masseter_eligible and seeds a
--      baseline masseter_capacity (typically 2 across the course).
--   2. Growth: reconcile_masseter_reservation() grows the reserved
--      seats to match the number of Zahnmediziner:innen booked into the
--      learner session (one masseter proband per dentist), as long as a
--      free general seat is available to convert. Growth is automatic
--      via a trigger on course_bookings. Shrinking is MANUAL ONLY (admin
--      decrements / cancels a reserved seat) so a dentist cancellation
--      never silently releases a reservation.
--
-- The bridge between the two booking worlds already exists:
-- courses.session_id references course_sessions(id) (proband satellite
-- courses are auto-created from learner sessions). Dentist count is read
-- from course_bookings via that session_id.

-- ── 1. Slot columns ──────────────────────────────────────────────────

ALTER TABLE slots
  ADD COLUMN IF NOT EXISTS masseter_eligible boolean NOT NULL DEFAULT false;

ALTER TABLE slots
  ADD COLUMN IF NOT EXISTS masseter_capacity int NOT NULL DEFAULT 0;

ALTER TABLE slots
  DROP CONSTRAINT IF EXISTS slots_masseter_capacity_within_capacity;
ALTER TABLE slots
  ADD CONSTRAINT slots_masseter_capacity_within_capacity
  CHECK (masseter_capacity >= 0 AND masseter_capacity <= capacity);

COMMENT ON COLUMN slots.masseter_eligible IS
  'True for slots that may hold reserved masseter seats (the later part of a Grundkurs Botulinum course, but not the two latest slots). Only eligible slots are touched by reconcile_masseter_reservation().';

COMMENT ON COLUMN slots.masseter_capacity IS
  'How many of this slot''s seats are reserved for masseter bookings (indication = ''masseter''). These seats are held back from general probands but immediately bookable by Masseterproband:innen. Always <= capacity.';

-- ── 2. available_slots view ──────────────────────────────────────────
-- Split remaining capacity into a general bucket and a masseter bucket.
-- The split only applies on masseter_eligible slots (Botulinum reserved
-- slots). On every other slot masseter is just a normal indication that
-- shares the general pool (e.g. the Therap. Indikationen course), so both
-- buckets equal the plain remaining_capacity there.
--
--   eligible slot:
--     general_remaining  = (capacity - masseter_capacity) - general bookings
--     masseter_remaining = masseter_capacity              - masseter bookings
--   non-eligible slot:
--     general_remaining = masseter_remaining = remaining_capacity
--
-- remaining_capacity (total free seats) is kept for backward compat.

-- DROP + CREATE rather than CREATE OR REPLACE: the new masseter columns
-- are inserted mid-list, which CREATE OR REPLACE VIEW rejects (it can
-- only append columns, never reorder). No other view depends on
-- available_slots, so dropping it first is safe.
DROP VIEW IF EXISTS available_slots;

CREATE VIEW available_slots AS
SELECT
  s.id,
  s.course_id,
  s.start_time,
  s.end_time,
  s.capacity,
  s.created_at,
  s.masseter_eligible,
  s.masseter_capacity,
  COALESCE(c.treatment_title, c.title) as course_title,
  c.description as course_description,
  c.course_date,
  s.capacity - bk.total_booked as remaining_capacity,
  CASE WHEN s.masseter_eligible
    THEN (s.capacity - s.masseter_capacity) - (bk.total_booked - bk.masseter_booked)
    ELSE s.capacity - bk.total_booked
  END as general_remaining,
  CASE WHEN s.masseter_eligible
    THEN s.masseter_capacity - bk.masseter_booked
    ELSE s.capacity - bk.total_booked
  END as masseter_remaining
FROM slots s
JOIN courses c ON c.id = s.course_id
CROSS JOIN LATERAL (
  SELECT
    COALESCE(count(*), 0) as total_booked,
    COALESCE(count(*) FILTER (WHERE b.indication = 'masseter'), 0) as masseter_booked
  FROM bookings b
  WHERE b.slot_id = s.id AND b.status IN ('booked', 'attended')
) bk
WHERE NOT s.blocked;

grant select on available_slots to anon, authenticated;

-- ── 3. create_encrypted_booking: reservation-aware capacity ──────────
-- Encryption fields (encrypted_data / encrypted_key / encryption_iv) are
-- passed through byte-for-byte unchanged. Only the capacity math changes.
--
-- Buckets only exist on masseter_eligible slots (Botulinum reserved
-- slots). There:
--   • a masseter booking takes a reserved seat (masseter_capacity bucket)
--   • every other booking takes a general seat (capacity - masseter)
-- On non-eligible slots masseter is a normal indication and all bookings
-- share the single pool, so only the total-capacity guard applies.

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
  v_masseter_capacity int;
  v_masseter_eligible boolean;
  v_blocked boolean;
  v_course_id uuid;
  v_total_booked int;
  v_masseter_booked int;
  v_is_masseter boolean;
  v_booking_id uuid;
BEGIN
  SELECT capacity, masseter_capacity, masseter_eligible, blocked, course_id
    INTO v_capacity, v_masseter_capacity, v_masseter_eligible, v_blocked, v_course_id
  FROM slots WHERE id = p_slot_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SLOT_NOT_FOUND';
  END IF;

  IF v_blocked THEN
    RAISE EXCEPTION 'SLOT_BLOCKED';
  END IF;

  v_is_masseter := (p_indication = 'masseter');

  SELECT
    COALESCE(count(*), 0),
    COALESCE(count(*) FILTER (WHERE indication = 'masseter'), 0)
    INTO v_total_booked, v_masseter_booked
  FROM bookings
  WHERE slot_id = p_slot_id AND status IN ('booked', 'attended');

  -- No free seat at all.
  IF v_total_booked >= v_capacity THEN
    RAISE EXCEPTION 'SLOT_FULL';
  END IF;

  IF v_masseter_eligible THEN
    IF v_is_masseter THEN
      -- Reserved bucket.
      IF v_masseter_booked >= v_masseter_capacity THEN
        RAISE EXCEPTION 'SLOT_FULL';
      END IF;
    ELSE
      -- General bucket must not eat into reserved masseter seats.
      IF (v_total_booked - v_masseter_booked) >= (v_capacity - v_masseter_capacity) THEN
        RAISE EXCEPTION 'SLOT_FULL';
      END IF;
    END IF;
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

-- ── 4. reconcile_masseter_reservation ────────────────────────────────
-- Grow-only. Brings the total reserved masseter seats of a course up to
-- greatest(p_floor, dentist_count), converting free (unbooked) general
-- seats on masseter-eligible slots. Never shrinks: a manual decrement or
-- a dentist cancellation never reduces the reservation here (manual
-- shrink sticks). If there is no convertible general seat left, the
-- reservation falls short and the Kurstermine warning surfaces it.

CREATE OR REPLACE FUNCTION reconcile_masseter_reservation(
  p_course_id uuid,
  p_floor int DEFAULT 0
) RETURNS void AS $$
DECLARE
  v_session_id uuid;
  v_dentist_count int;
  v_target int;
  v_current int;
  v_to_add int;
  v_slot_id uuid;
  v_free_general int;
BEGIN
  -- Only operate on courses that actually have masseter-eligible slots.
  IF NOT EXISTS (
    SELECT 1 FROM slots WHERE course_id = p_course_id AND masseter_eligible
  ) THEN
    RETURN;
  END IF;

  SELECT session_id INTO v_session_id FROM courses WHERE id = p_course_id;

  v_dentist_count := 0;
  IF v_session_id IS NOT NULL THEN
    SELECT count(*) INTO v_dentist_count
    FROM course_bookings
    WHERE session_id = v_session_id
      AND audience_tag = 'Zahnmediziner:in'
      AND status <> 'cancelled';
  END IF;

  v_target := greatest(p_floor, v_dentist_count);

  SELECT COALESCE(sum(masseter_capacity), 0) INTO v_current
  FROM slots WHERE course_id = p_course_id AND masseter_eligible;

  v_to_add := v_target - v_current;
  IF v_to_add <= 0 THEN
    RETURN;  -- grow-only
  END IF;

  WHILE v_to_add > 0 LOOP
    -- Pick the eligible, unblocked slot with the most spare (unbooked)
    -- general capacity to convert. Ties broken by earliest start_time.
    SELECT s.id,
      (s.capacity - s.masseter_capacity) - COALESCE(
        (SELECT count(*) FROM bookings b
         WHERE b.slot_id = s.id AND b.status IN ('booked', 'attended')
           AND b.indication IS DISTINCT FROM 'masseter'), 0)
    INTO v_slot_id, v_free_general
    FROM slots s
    WHERE s.course_id = p_course_id AND s.masseter_eligible AND NOT s.blocked
    ORDER BY
      ((s.capacity - s.masseter_capacity) - COALESCE(
        (SELECT count(*) FROM bookings b
         WHERE b.slot_id = s.id AND b.status IN ('booked', 'attended')
           AND b.indication IS DISTINCT FROM 'masseter'), 0)) DESC,
      s.start_time ASC
    LIMIT 1;

    IF v_slot_id IS NULL OR v_free_general <= 0 THEN
      EXIT;  -- no convertible general seat left; shortfall is expected
    END IF;

    UPDATE slots SET masseter_capacity = masseter_capacity + 1
    WHERE id = v_slot_id;

    v_to_add := v_to_add - 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. Trigger: grow reservation when a dentist books ────────────────
-- Fires on the learner-side course_bookings. Ignores everything that is
-- not an active Zahnmediziner:in row, then reconciles every satellite
-- course bridged to that session with floor 0 (so it grows with dentists
-- but never re-imposes a baseline over a manual decrement).

CREATE OR REPLACE FUNCTION trg_course_bookings_reconcile_masseter()
RETURNS trigger AS $$
DECLARE
  v_course_id uuid;
BEGIN
  IF COALESCE(NEW.audience_tag, '') <> 'Zahnmediziner:in' THEN
    RETURN NEW;
  END IF;
  IF NEW.session_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_course_id IN
    SELECT id FROM courses WHERE session_id = NEW.session_id
  LOOP
    PERFORM reconcile_masseter_reservation(v_course_id, 0);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS course_bookings_reconcile_masseter ON course_bookings;
CREATE TRIGGER course_bookings_reconcile_masseter
AFTER INSERT OR UPDATE OF audience_tag, session_id, status ON course_bookings
FOR EACH ROW
EXECUTE FUNCTION trg_course_bookings_reconcile_masseter();
