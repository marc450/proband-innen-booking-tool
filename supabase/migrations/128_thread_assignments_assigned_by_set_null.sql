-- 128_thread_assignments_assigned_by_set_null.sql
-- Second fix for "Database error deleting user".
--
-- public.thread_assignments.assigned_by references auth.users(id) as
-- NOT NULL with ON DELETE NO ACTION (the table was created directly in
-- Supabase, not via a migration, so migration 127 didn't cover it).
-- Deleting a staff user who has assigned any inbox thread is blocked by
-- this FK, and Supabase Auth reports it as the generic "Database error
-- deleting user".
--
-- assigned_by is attribution-only metadata ("assigned by whom"); the
-- assignment's real target is assigned_to (a separate FK, already
-- ON DELETE CASCADE). So when the assigner is deleted we want to keep the
-- assignment and just drop the attribution: make the column nullable and
-- switch the FK to ON DELETE SET NULL. This matches every other "_by"
-- column in the schema. CASCADE was rejected because it would delete live
-- thread assignments whenever the assigner leaves.

alter table public.thread_assignments
  alter column assigned_by drop not null;

alter table public.thread_assignments
  drop constraint thread_assignments_assigned_by_fkey,
  add constraint thread_assignments_assigned_by_fkey
    foreign key (assigned_by) references auth.users(id)
    on delete set null;
