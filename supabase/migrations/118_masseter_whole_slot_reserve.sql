-- Masseter reservation, take 2: reserve WHOLE slots, fully automatic.
--
-- Migration 117 modelled masseter reservation as a per-slot seat count
-- (masseter_capacity) that an admin first had to seed by marking slots
-- eligible. In practice the proband slots are capacity 1, so "reserve 1
-- seat in this slot" is the same as "reserve this whole slot", and the
-- count picker / pre-marking were just friction.
--
-- New model:
--   • A slot is either fully reserved for Masseter (masseter_eligible =
--     true, masseter_capacity = capacity) or not (false / 0).
--   • Reservation is fully automatic: when a Zahnmediziner:in books the
--     learner session, the DB reserves enough whole unbooked slots to
--     match the dentist count. No admin pre-marking needed.
--   • Slot pick order: skip the two latest slots of the course, then fill
--     from the 3rd-last slot backwards (3rd-last, 4th-last, 5th-last, ...).
--     Only unbooked slots are taken, so a slot already holding a general
--     proband is never converted.
--   • Staff can still reserve additional slots by hand (whole-slot toggle
--     in the Kurs-Detail slot dialog), and those count toward the target.
--   • Grow-only: a dentist cancellation never auto-releases a reservation
--     (a manual untick is the only way to free a reserved slot).
--
-- The available_slots view and create_encrypted_booking RPC from 117 are
-- unchanged: their bucket math already does the right thing when
-- masseter_capacity = capacity (general_remaining collapses to 0,
-- masseter_remaining = capacity). Encryption is NOT touched.

CREATE OR REPLACE FUNCTION reconcile_masseter_reservation(
  p_course_id uuid,
  p_floor int DEFAULT 0
) RETURNS void AS $$
DECLARE
  v_session_id uuid;
  v_dentist_count int;
  v_target int;
  v_current int;
  v_slot_id uuid;
  v_slot_capacity int;
BEGIN
  SELECT session_id INTO v_session_id FROM courses WHERE id = p_course_id;

  v_dentist_count := 0;
  IF v_session_id IS NOT NULL THEN
    SELECT count(*) INTO v_dentist_count
    FROM course_bookings
    WHERE session_id = v_session_id
      AND audience_tag = 'Zahnmediziner:in'
      AND status <> 'cancelled';
  END IF;

  -- One masseter proband (= one reserved seat) per dentist.
  v_target := greatest(p_floor, v_dentist_count);

  -- Already-reserved seats, manual or auto, count toward the target.
  SELECT COALESCE(sum(masseter_capacity), 0) INTO v_current
  FROM slots WHERE course_id = p_course_id;

  IF v_current >= v_target THEN
    RETURN;  -- grow-only
  END IF;

  -- Reserve whole unbooked slots, 3rd-last first, until the target is met
  -- or no convertible slot is left (then the shortfall surfaces in the UI).
  WHILE v_current < v_target LOOP
    WITH ranked AS (
      SELECT s.id, s.capacity, s.masseter_capacity,
             row_number() OVER (ORDER BY s.start_time DESC) AS rn
      FROM slots s
      WHERE s.course_id = p_course_id AND NOT s.blocked
    )
    SELECT r.id, r.capacity
      INTO v_slot_id, v_slot_capacity
    FROM ranked r
    WHERE r.rn >= 3                       -- skip the two latest slots
      AND r.masseter_capacity = 0         -- not already reserved
      AND NOT EXISTS (                     -- and not already booked
        SELECT 1 FROM bookings b
        WHERE b.slot_id = r.id AND b.status IN ('booked', 'attended')
      )
    ORDER BY r.rn ASC                      -- 3rd-last, then 4th-last, ...
    LIMIT 1;

    IF v_slot_id IS NULL THEN
      EXIT;  -- no convertible slot left; shortfall is expected
    END IF;

    UPDATE slots
      SET masseter_eligible = true,
          masseter_capacity = capacity
    WHERE id = v_slot_id;

    v_current := v_current + v_slot_capacity;
    v_slot_id := NULL;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
