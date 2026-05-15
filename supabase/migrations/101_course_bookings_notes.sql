-- 101_course_bookings_notes.sql
-- Per-booking internal note for Auszubildende course bookings, mirroring
-- the notes field on Proband:innen bookings. Surfaced inline in the
-- Kurstermin detail (/dashboard/kurse/[sessionId]) so Kursbetreuung
-- can capture per-event context (Schwangerschaft, frühere Reaktion,
-- Sitzplatzwunsch, …) next to each name.
--
-- course_bookings has no E2EE (see ARCHITECTURE.md: doctor PII stored in
-- plaintext), so a plain text column is fine here.

alter table public.course_bookings
  add column if not exists notes text;
