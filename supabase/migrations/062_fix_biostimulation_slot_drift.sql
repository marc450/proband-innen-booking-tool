-- One-off data correction.
--
-- Course "Aufbaukurs Biostimulation & Skinbooster" (id 5d02977f-…) had its
-- course_date set to 2026-05-10, but all 10 slots stayed pinned to
-- 2026-05-17. The slots were originally created with the wrong date
-- (course_date was 2026-05-17 at insert time), then someone corrected
-- only courses.course_date to 2026-05-10 via the admin edit dialog. At
-- that time handleEditCourse only wrote to the courses row and didn't
-- propagate the date change to the slots — so the slot timestamps were
-- left 7 days in the future.
--
-- The 10 already-booked probands received confirmation emails that read
-- courses.course_date (2026-05-10), so the date in their inboxes is
-- correct. No notification needed; we just shift the slot timestamps
-- back 7 days so the bookings list and any future slot joins agree with
-- the course header.
--
-- Going forward, the slot drift is prevented at the source: the admin
-- edit dialog now propagates course_date changes to all slots of the
-- course (commit 481e1fb).
--
-- Idempotent: the date-range filter no longer matches once shifted.

UPDATE slots
SET start_time = start_time - INTERVAL '7 days'
WHERE course_id = '5d02977f-3cc3-4bdf-8aad-056e70f718a7'
  AND start_time >= '2026-05-17T00:00:00Z'
  AND start_time <  '2026-05-18T00:00:00Z';
