-- Nachbehandlungs-Slots: Folgetermine für bereits behandelte Proband:innen.
--
-- Staff (Dozent:innen + Admins) legen im Kurs-Detail einen dedizierten
-- Nachbehandlungs-Slot an und weisen direkt eine:n bestehende:n Proband:in
-- zu. Solche Slots sind NICHT öffentlich buchbar: sie tauchen nie im
-- /book- oder /book/privat-Funnel auf. Die Nachbehandlung ist kostenlos.
--
-- Umsetzung:
--   • Neue Spalte slots.slot_type ('regular' | 'nachbehandlung'), Default
--     'regular' — alle bestehenden Slots bleiben regulär buchbar.
--   • available_slots View filtert slot_type = 'regular' zusätzlich zum
--     bestehenden NOT blocked, damit Nachbehandlungs-Slots aus dem
--     Buchungs-Funnel verschwinden.
--
-- Encryption ist NICHT betroffen. create_encrypted_booking bleibt
-- unverändert; Nachbehandlungs-Bookings werden serverseitig per
-- Direct-Insert erzeugt (frischer Kapazität-1-Slot, kein DUPLICATE-Guard,
-- da der:die Proband:in i.d.R. schon eine Buchung im selben Kurs hat).

alter table slots
  add column if not exists slot_type text not null default 'regular';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'slots_slot_type_check'
  ) then
    alter table slots
      add constraint slots_slot_type_check
      check (slot_type in ('regular', 'nachbehandlung'));
  end if;
end $$;

-- available_slots neu erstellen (DROP + CREATE, exakt die Definition aus
-- 117_masseter_reservation.sql, plus AND s.slot_type = 'regular' in der
-- WHERE-Klausel). Kein anderer View hängt an available_slots.
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
WHERE NOT s.blocked
  AND s.slot_type = 'regular';

grant select on available_slots to anon, authenticated;

-- reconcile_masseter_reservation (aus 119) darf Nachbehandlungs-Slots nicht
-- als Masseter-Kandidaten ranken. Sie sind zwar unblocked, aber dedizierte
-- Folgetermine und dürfen nie masseter_eligible werden. Funktionskörper
-- identisch zu 119, nur der innere Slot-Select filtert zusätzlich
-- slot_type = 'regular'.
CREATE OR REPLACE FUNCTION reconcile_masseter_reservation(
  p_course_id uuid,
  p_floor int DEFAULT 0
) RETURNS void AS $$
DECLARE
  r record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM courses c
    JOIN course_templates t ON t.id = c.template_id
    WHERE c.id = p_course_id
      AND t.course_key LIKE 'grundkurs_botulinum%'
  ) THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT s.id
    FROM (
      SELECT id, capacity, masseter_capacity,
             row_number() OVER (ORDER BY start_time DESC) AS rn
      FROM slots
      WHERE course_id = p_course_id AND NOT blocked
        AND slot_type = 'regular'
    ) s
    WHERE s.rn IN (3, 4)
      AND s.masseter_capacity = 0
      AND NOT EXISTS (
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
