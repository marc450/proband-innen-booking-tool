-- 158: Two-strikes state for the Zahlungsabgleich.
--
-- A session is "unverifiable" when the reconciliation pass throws while
-- checking it, almost always a transient database hiccup during the count
-- query. On its own that is not worth waking anyone: the very next run usually
-- checks it cleanly. But a session that stays unverifiable across runs might be
-- hiding a real missing booking, so it must eventually surface.
--
-- This table is the cross-run memory that lets the pass wait for a second
-- strike before it alerts. One row per still-unverifiable session; `strikes`
-- counts consecutive failed runs. A run that finally checks the session
-- (cleanly or as a real problem) deletes its row, so the counter only ever
-- reflects a CONSECUTIVE streak. Rows for sessions that age out of the scan
-- window are pruned by the pass.
--
-- Deliberately separate from payment_reconciliation_alerts: that table is the
-- audit trail of confirmed money problems, and mixing transient "couldn't
-- check" state into it would both muddy that trail and risk masking a real
-- problem behind a stale unverified row (the unique-per-session constraint
-- allows only one row per session).

create table if not exists public.payment_reconciliation_unverified (
  stripe_checkout_session_id  text primary key,
  strikes                     integer not null default 1,
  first_seen_at               timestamptz not null default now(),
  last_seen_at                timestamptz not null default now()
);

-- Touched only by the service_role reconciliation pass. No anon/authenticated
-- access: this is internal plumbing state, not something staff read. RLS on
-- with no policy means only service_role (which bypasses RLS) can reach it.
grant select, insert, update, delete on public.payment_reconciliation_unverified to service_role;

alter table public.payment_reconciliation_unverified enable row level security;

-- Atomically record a strike for each still-unverifiable session and return the
-- resulting streak length, so the pass can escalate only those at >= 2. Insert
-- starts the streak at 1; a repeat bumps it and refreshes last_seen_at.
-- OUT columns are named distinctly from the table columns on purpose: sharing
-- names would make bare references inside the body ambiguous in plpgsql.
create or replace function public.bump_payment_unverified(p_session_ids text[])
returns table (session_id text, strike_count integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'not authorized';
  end if;

  return query
  insert into public.payment_reconciliation_unverified as u (stripe_checkout_session_id)
  select unnest(p_session_ids)
  on conflict (stripe_checkout_session_id)
  do update set strikes = u.strikes + 1, last_seen_at = now()
  returning u.stripe_checkout_session_id, u.strikes;
end;
$$;

revoke execute on function public.bump_payment_unverified(text[]) from public, anon, authenticated;
grant execute on function public.bump_payment_unverified(text[]) to service_role;
