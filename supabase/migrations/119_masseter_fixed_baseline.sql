-- Masseter reservation, take 3: a fixed default-2 baseline on the
-- 3rd-last and 4th-last slot of every Grundkurs Botulinum course.
--
-- Supersedes the dentist-count-driven, backward-filling logic from
-- migrations 117/118. New rule, per Marc:
--   • Reservations live ONLY on the 3rd-last and 4th-last slots of a
--     Grundkurs Botulinum proband course.
--   • Each of those two is reserved as a whole slot IF it is free
--     (unblocked, unbooked, not already reserved). If it is already
--     booked, leave it alone, never cancel a booking, never slide the
--     reservation onto an earlier slot.
--   • So the automatic reservation is at most 2, independent of the
--     dentist count. Staff can still reserve additional slots by hand
--     (whole-slot toggle in the Kurs-Detail dialog) for the rare case
--     of a third dentist.
--   • Scope: Grundkurs Botulinum only (course_key like grundkurs_botulinum%,
--     which also covers the Zahnmedizin variant). The Therap. Indikationen
--     course is deliberately excluded, it books INTO these reserved slots.
--
-- Seeding happens once when the proband satellite is created
-- (createSatelliteForSession calls this RPC) and via the one-time backfill
-- at the bottom. Nothing re-imposes the baseline afterwards, so a manual
-- un-reservation sticks until staff acts again.
--
-- The available_slots view and create_encrypted_booking RPC from 117 are
-- unchanged. Encryption is NOT touched.

-- ── 1. Drop the dentist-count auto-grow trigger ──────────────────────
-- Reservations no longer track the dentist count, so the course_bookings
-- trigger that grew them is obsolete.
DROP TRIGGER IF EXISTS course_bookings_reconcile_masseter ON course_bookings;
DROP FUNCTION IF EXISTS trg_course_bookings_reconcile_masseter();

-- ── 2. Reconcile: reserve the 3rd/4th-last slot if free ──────────────
-- Signature kept (p_floor retained but ignored) so existing call sites
-- and the RPC name stay stable.
CREATE OR REPLACE FUNCTION reconcile_masseter_reservation(
  p_course_id uuid,
  p_floor int DEFAULT 0
) RETURNS void AS $$
DECLARE
  r record;
BEGIN
  -- Gate: Grundkurs Botulinum proband courses only.
  IF NOT EXISTS (
    SELECT 1 FROM courses c
    JOIN course_templates t ON t.id = c.template_id
    WHERE c.id = p_course_id
      AND t.course_key LIKE 'grundkurs_botulinum%'
  ) THEN
    RETURN;
  END IF;

  -- Rank usable (unblocked) slots latest-first. The 3rd-last and 4th-last
  -- (rn 3 and 4) are the masseter candidates: skip the two latest, never
  -- go earlier than the 4th-last.
  FOR r IN
    SELECT s.id
    FROM (
      SELECT id, capacity, masseter_capacity,
             row_number() OVER (ORDER BY start_time DESC) AS rn
      FROM slots
      WHERE course_id = p_course_id AND NOT blocked
    ) s
    WHERE s.rn IN (3, 4)
      AND s.masseter_capacity = 0          -- not already reserved
      AND NOT EXISTS (                      -- and not already booked
        SELECT 1 FROM bookings b
        WHERE b.slot_id = s.id AND b.status IN ('booked', 'attended')
      )
  LOOP
    UPDATE slots
      SET masseter_eligible = true,
          masseter_capacity = capacity
    WHERE id = r.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 3. One-time backfill for existing Grundkurs Botulinum courses ────
-- Reserves the free 3rd/4th-last slots on every current Grundkurs
-- Botulinum proband course. Skips slots that are already booked
-- (no booking is ever cancelled). Safe to run once.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT cs.id
    FROM courses cs
    JOIN course_templates t ON t.id = cs.template_id
    WHERE t.course_key LIKE 'grundkurs_botulinum%'
  LOOP
    PERFORM reconcile_masseter_reservation(c.id);
  END LOOP;
END $$;
