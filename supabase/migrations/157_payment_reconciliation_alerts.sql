-- 157: Zahlungsabgleich (Stripe vs. Datenbank).
--
-- Bookkeeping for the reconciliation pass. The pass asks one blunt question on
-- a schedule: does every PAID Stripe checkout session have the records it is
-- supposed to have in our database?
--
-- Why this exists: several webhook paths take money and then drop the work on
-- the floor with an HTTP 200, so Stripe never retries and no human ever finds
-- out. Known examples at the time of writing: the curriculum bundle loop
-- `continue`s past a failed booking RPC (stripe-webhook route, curriculum
-- handler), the Umbuchung handler bare-`return`s when apply_course_rebooking
-- errors, and any session whose metadata we don't recognise is silently
-- ignored. Alerting each of those individually only ever catches the failures
-- we thought of. Comparing Stripe's truth against ours catches all of them,
-- including the ones we break next, and the SEPA case where money is confirmed
-- days after the booking was created.
--
-- One row per problem session. `stripe_checkout_session_id` is unique, so a
-- daily pass alerts once and then stays quiet instead of re-reporting the same
-- session forever. `resolved_at` is stamped when a later run finds the records
-- present after all (a Stripe webhook retry succeeded, or staff fixed it by
-- hand), which keeps the table as the audit trail of what actually broke.

create table if not exists public.payment_reconciliation_alerts (
  id                          uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id  text not null unique,
  -- What is wrong. Kept as free text + check so a new failure shape is a
  -- one-line migration rather than an enum dance.
  kind                        text not null
                                check (kind in (
                                  'missing_booking',
                                  'partial_curriculum',
                                  'rebooking_not_applied',
                                  'missing_merch_order',
                                  'unrecognized_session'
                                )),
  expected_records            integer,
  found_records               integer,
  amount_total_cents          integer,
  currency                    text,
  customer_email              text,
  -- When Stripe says the session was created, so staff can find it fast.
  session_created_at          timestamptz,
  detected_at                 timestamptz not null default now(),
  -- Set once the records show up after all. Null = still broken.
  resolved_at                 timestamptz,
  notes                       text
);

create index if not exists payment_reconciliation_alerts_open_idx
  on public.payment_reconciliation_alerts(detected_at)
  where resolved_at is null;

-- Data API access. Written only by the service_role reconciliation pass.
-- Staff may read it (it carries a customer email, so no anon, and is_staff()
-- rather than the too-broad `auth.uid() is not null` that migration 151
-- replaced elsewhere) so a future dashboard can list open alerts.
grant select on public.payment_reconciliation_alerts to authenticated;
grant select, insert, update, delete on public.payment_reconciliation_alerts to service_role;

alter table public.payment_reconciliation_alerts enable row level security;

create policy "payment_reconciliation_alerts staff select"
  on public.payment_reconciliation_alerts
  for select to authenticated using (public.is_staff());
