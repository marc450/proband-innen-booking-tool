-- 101_patient_status_allow_inactive.sql
--
-- The patients_patient_status_check constraint was created with the
-- original 3 values (active, warning, blacklist) and never updated
-- when 'inactive' was introduced. Result: every dashboard status
-- change to 'inactive' fails at the DB layer, but the browser-side
-- supabase.update() call ignores the error and the optimistic UI
-- update masks the failure until the next page refresh.
--
-- The same constraint silently broke /api/unsubscribe — the opt-out
-- endpoint runs via the service-role admin client (which still
-- enforces CHECK constraints) so the opt-out link never actually
-- flipped any patient's status either.

alter table public.patients
  drop constraint if exists patients_patient_status_check;

alter table public.patients
  add constraint patients_patient_status_check
  check (patient_status in ('active', 'warning', 'blacklist', 'inactive'));
