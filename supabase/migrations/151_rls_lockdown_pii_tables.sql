-- 151: Lock RLS on PII / payment tables down to staff only.
--
-- Audit finding: bookings, course_bookings, patients, merch_orders and
-- email_campaigns all exposed their rows to the `authenticated` role via
-- `using (true)` (or `auth.uid() is not null`) policies. Because
-- `student` customers share the auth.users table with staff, any logged-in
-- customer could read every row through the Data API using the public
-- anon key + their session. patients additionally allowed authenticated
-- INSERT/UPDATE (a customer could write patient PII). bookings allowed
-- `anon` INSERT. admin_actions had no RLS.
--
-- Why this is safe for the app: the staff dashboard reads these tables as
-- the logged-in staff user (role admin/nutzer). Every other access path
-- (customer /mein-konto, public /proband-bewertung, all /api routes and
-- webhooks) goes through the service_role admin client, which BYPASSES
-- RLS. So restricting the `authenticated` role to staff, and removing
-- anon, changes nothing for staff or customers; it only cuts off the
-- student/anon exposure. Writes the app performs via service_role are
-- unaffected.
--
-- NOTE: this touches `patients`, the E2EE table. It only removes non-staff
-- access; the staff-read and service_role read/write paths the app uses
-- are preserved. No encrypted data, key handling, or column shape changes.

-- ── Staff predicate ────────────────────────────────────────────────────
-- SECURITY DEFINER so it resolves the caller's role regardless of RLS on
-- profiles; auth.uid() still reflects the calling user inside a definer
-- function. Fixed search_path per Supabase hardening guidance.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'nutzer')
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated, service_role;

-- ── bookings ───────────────────────────────────────────────────────────
alter table public.bookings enable row level security;
drop policy if exists "Public can insert bookings" on public.bookings;   -- anon insert: attack surface
drop policy if exists "Staff can view all bookings" on public.bookings;
drop policy if exists "Staff can update bookings" on public.bookings;
drop policy if exists "Staff can delete bookings" on public.bookings;

create policy "bookings staff select" on public.bookings
  for select to authenticated using (public.is_staff());
create policy "bookings staff update" on public.bookings
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "bookings staff delete" on public.bookings
  for delete to authenticated using (public.is_staff());
-- No INSERT policy: bookings are created only by the service_role
-- create_encrypted_booking RPC.

-- ── course_bookings ────────────────────────────────────────────────────
alter table public.course_bookings enable row level security;
drop policy if exists "Authenticated can view course bookings" on public.course_bookings;
drop policy if exists "Authenticated can insert course bookings" on public.course_bookings;
drop policy if exists "Authenticated can update course bookings" on public.course_bookings;
-- The two "Service role can ..." policies stay (harmless; service_role
-- bypasses RLS regardless).

create policy "course_bookings staff select" on public.course_bookings
  for select to authenticated using (public.is_staff());
create policy "course_bookings staff update" on public.course_bookings
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "course_bookings staff delete" on public.course_bookings
  for delete to authenticated using (public.is_staff());
-- No INSERT policy: course_bookings are created by the service_role
-- create_course_booking RPC / webhook.

-- ── patients (E2EE) ────────────────────────────────────────────────────
alter table public.patients enable row level security;
drop policy if exists "Staff can read patients" on public.patients;      -- was using(true)
drop policy if exists "Service can insert patients" on public.patients;  -- authenticated insert
drop policy if exists "Service can update patients" on public.patients;  -- authenticated update

create policy "patients staff select" on public.patients
  for select to authenticated using (public.is_staff());
-- No authenticated INSERT/UPDATE/DELETE: all patient writes go through the
-- service_role admin client (update-patient-fields/notes, import, etc.).

-- ── merch_orders ───────────────────────────────────────────────────────
alter table public.merch_orders enable row level security;
drop policy if exists "merch_orders staff rw" on public.merch_orders;    -- was auth.uid() is not null

create policy "merch_orders staff all" on public.merch_orders
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ── email_campaigns ────────────────────────────────────────────────────
alter table public.email_campaigns enable row level security;
drop policy if exists "Authenticated can view email_campaigns" on public.email_campaigns;
drop policy if exists "Authenticated can insert email_campaigns" on public.email_campaigns;
drop policy if exists "Authenticated can update email_campaigns" on public.email_campaigns;
drop policy if exists "Authenticated can delete email_campaigns" on public.email_campaigns;

create policy "email_campaigns staff all" on public.email_campaigns
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ── admin_actions (audit log) ──────────────────────────────────────────
-- Written only by the service_role admin client. Enable RLS with no
-- policy so anon/authenticated get nothing; service_role bypasses. Also
-- revoke the default Data API grants for defense in depth.
alter table public.admin_actions enable row level security;
revoke all on public.admin_actions from anon, authenticated;
