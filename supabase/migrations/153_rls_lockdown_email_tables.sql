-- 153: Lock down patient_email_hashes + auszubildende_emails RLS.
--
-- Both were created in 044 with:
--   FOR ALL TO authenticated USING (auth.uid() IS NOT NULL)
-- which is the same flawed pattern 151 fixed for merch_orders. These two
-- tables were missed by that pass (they weren't in the audit's table list).
--
-- Because `student` customers share auth.users with staff, any logged-in
-- customer could, with the public anon key + their session, read:
--   - auszubildende_emails  → every doctor's email address in PLAINTEXT
--   - patient_email_hashes  → every patient's email_hash (+ encrypted_email)
-- and, being FOR ALL, write them too.
--
-- The patient_email_hashes exposure also partly undercut migration 152's
-- HMAC work: email_hash was exactly the reversible value we replaced.
--
-- Safe for the app: both tables are written/read server-side through the
-- service-role admin client (booking flows, inbox routes, contact-emails
-- helpers), which bypasses RLS, and read by the staff dashboard as the
-- authenticated staff user, which satisfies is_staff(). No student-facing
-- flow touches either table through the user-scoped client.

alter table public.auszubildende_emails enable row level security;
drop policy if exists "auszubildende_emails staff rw" on public.auszubildende_emails;
create policy "auszubildende_emails staff rw" on public.auszubildende_emails
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

alter table public.patient_email_hashes enable row level security;
drop policy if exists "patient_email_hashes staff rw" on public.patient_email_hashes;
create policy "patient_email_hashes staff rw" on public.patient_email_hashes
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());
