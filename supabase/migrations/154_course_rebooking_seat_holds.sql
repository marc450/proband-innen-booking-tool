-- 154: Seat holds for gated Umbuchungen.
--
-- Until now a pending Umbuchung moved no seats at all: the doctor kept
-- blocking her ORIGINAL seat until she paid the Umbuchungsgebühr, and the
-- TARGET seat was not protected, so it could be sold from under her. Both
-- ends were wrong commercially: an unpaid rebooking froze a sellable seat
-- for an unbounded time (nothing ever expired a pending request), and a
-- paid one could land in a session that had meanwhile filled up.
--
-- From here the pending request IS the reservation. Seats move at REQUEST
-- time, not at payment time:
--
--   request created  -> from_session -1, to_session +1   (seats_held = true)
--   fee paid         -> booking.session_id switches, seats already correct
--   expired unpaid   -> to_session -1, from_session +1   (seats_held = false)
--
-- Because a hold is simply a booked seat, none of the ~10 places that read
-- availability (public widget, SEO stock status, checkout guard, admin
-- dashboards) need to change: they all compute max_seats - booked_seats and
-- keep working. The target session correctly reads as fuller while the fee
-- is outstanding, and the staff UI resolves the difference between "booked"
-- and "reserved" by reading the pending requests.
--
-- Expiry policy (decided with Marc, 2026-07-17): a hold lives 7 days, but
-- never past 2 days before the ORIGINAL course date, whichever comes first
-- (a doctor rebooking days before her course must not hold the seat past the
-- course itself). expires_at is computed in the API route, which knows the
-- old session's date. On expiry the original seat is restored UNCLAMPED and
-- may push the session to booked_seats = max_seats + 1. That is deliberate:
-- until she pays she stays officially booked on the original date (AGB), so
-- if her freed seat was resold in the meantime the overbooking is the
-- correct outcome. The dashboard already renders this state ("Überbucht um
-- N"), invites produce it today, and the reaper Slacks the team.

alter table public.course_rebooking_requests
  add column if not exists expires_at timestamptz,
  -- Whether this request currently holds seats. Requests created BEFORE this
  -- migration are pending with seats_held = false: they hold nothing, so the
  -- apply path must still do the seat math for them and the reaper must not
  -- release seats that were never taken. Also makes apply/expire idempotent.
  add column if not exists seats_held boolean not null default false;

create index if not exists course_rebooking_requests_pending_idx
  on public.course_rebooking_requests(status, expires_at)
  where status = 'pending';

-- Requests that hold a seat in a session, for the staff UI.
--
-- security_invoker so the view does NOT launder course_bookings' RLS: a plain
-- view runs as its owner, which would hand every logged-in `student` the names
-- and emails this join exposes — exactly the hole migration 151 closed. Both
-- consumers (the Kurstermin detail and the Buchungen list) read it through the
-- service_role admin client, so it is granted to service_role only.
create or replace view public.course_rebooking_holds
with (security_invoker = true) as
  select r.id,
         r.booking_id,
         r.from_session_id,
         r.to_session_id,
         r.to_template_id,
         r.to_course_type,
         r.fee_cents,
         r.surcharge_cents,
         r.created_at,
         r.expires_at,
         b.first_name,
         b.last_name,
         b.email
    from public.course_rebooking_requests r
    join public.course_bookings b on b.id = r.booking_id
   where r.status = 'pending'
     and r.seats_held = true;

revoke all on public.course_rebooking_holds from anon, authenticated;
grant select on public.course_rebooking_holds to service_role;

-- While we're here: 132 shipped this table with `auth.uid() is not null`, the
-- same too-broad policy 151 replaced everywhere else, so any logged-in customer
-- could read (and write) rebooking requests. Nothing touches it from the
-- browser except cancel_course_rebooking, which gates on is_staff() itself.
drop policy if exists "course_rebooking_requests staff rw" on public.course_rebooking_requests;
create policy "course_rebooking_requests staff select" on public.course_rebooking_requests
  for select to authenticated using (public.is_staff());
-- Writes are service_role (create/apply) or the is_staff()-gated cancel RPC.
revoke insert, update, delete on public.course_rebooking_requests from authenticated;

-- Create a pending request AND take the seats in one transaction, so a
-- request can never exist without its hold (or vice versa).
create or replace function public.create_course_rebooking_request(
  p_booking_id      uuid,
  p_to_session_id   uuid,
  p_fee_cents       integer,
  p_surcharge_cents integer,
  p_to_template_id  uuid,
  p_to_course_type  text,
  p_created_by      uuid,
  p_expires_at      timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_session_id uuid;
  v_request_id      uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'not authorized';
  end if;

  -- Lock the booking so two admins can't open two rebookings for the same
  -- doctor and take two holds for one seat.
  select session_id into v_from_session_id
  from public.course_bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.course_rebooking_requests
    where booking_id = p_booking_id and status = 'pending'
  ) then
    raise exception 'REBOOKING_ALREADY_PENDING';
  end if;

  insert into public.course_rebooking_requests
    (booking_id, from_session_id, to_session_id, fee_cents, surcharge_cents,
     to_template_id, to_course_type, status, created_by, expires_at, seats_held)
  values
    (p_booking_id, v_from_session_id, p_to_session_id, p_fee_cents, p_surcharge_cents,
     p_to_template_id, p_to_course_type, 'pending', p_created_by, p_expires_at, true)
  returning id into v_request_id;

  -- Release the original seat immediately so it can be resold.
  if v_from_session_id is not null then
    update public.course_sessions
       set booked_seats = greatest(booked_seats - 1, 0)
     where id = v_from_session_id;
  end if;

  -- Hold the target seat. Unclamped, like every other staff-initiated move:
  -- staff deliberately rebooking into a full session must not silently lose
  -- the hold to a LEAST(..., max_seats) clamp.
  update public.course_sessions
     set booked_seats = booked_seats + 1
   where id = p_to_session_id;

  return v_request_id;
end;
$$;

revoke execute on function public.create_course_rebooking_request(uuid, uuid, integer, integer, uuid, text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.create_course_rebooking_request(uuid, uuid, integer, integer, uuid, text, uuid, timestamptz) to service_role;

-- Apply a paid rebooking. Still idempotent (a duplicated Stripe webhook can't
-- move the booking twice), but the seat math now only runs when the request
-- isn't already holding its seats — a live hold has them in the right place
-- already, so applying it must NOT move them again.
create or replace function public.apply_course_rebooking(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.course_rebooking_requests%rowtype;
begin
  select * into v_req
  from public.course_rebooking_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'REBOOKING_REQUEST_NOT_FOUND';
  end if;

  -- Already applied: no-op, so a duplicated Stripe webhook can't move the
  -- booking twice or double-count seats.
  if v_req.status = 'applied' then
    return v_req.booking_id;
  end if;

  -- A 'cancelled' request deliberately falls through and IS applied. Reaching
  -- here means Stripe confirmed her payment: she may have completed a checkout
  -- tab that was opened before the reaper released her hold (the payment page
  -- refuses lapsed links, but an already-open Stripe session survives). She
  -- paid, so she gets her seat. Taking the fee and silently not moving her
  -- would be the worst possible outcome; re-taking a released seat below and
  -- possibly overbooking the target is the lesser evil, and staff see it.
  -- Not gated on expires_at for the same reason.

  -- Move the booking to the new session. When the move also crosses courses,
  -- switch the template + course_type. amount_paid is intentionally left as-is
  -- (see 141's header note on the cancel-refund invoice mismatch).
  if v_req.to_template_id is not null then
    update public.course_bookings
       set session_id  = v_req.to_session_id,
           template_id = v_req.to_template_id,
           course_type = coalesce(v_req.to_course_type, course_type)
     where id = v_req.booking_id;
  else
    update public.course_bookings
       set session_id = v_req.to_session_id
     where id = v_req.booking_id;
  end if;

  -- Seats only move here when this request isn't already holding them: either
  -- it predates migration 154, or its hold was released (reaper / staff
  -- withdrawal) and she paid anyway. A live hold already has the seats in the
  -- right place, so touching them again would double-count.
  if not v_req.seats_held then
    if v_req.from_session_id is not null then
      update public.course_sessions
         set booked_seats = greatest(booked_seats - 1, 0)
       where id = v_req.from_session_id;
    end if;

    update public.course_sessions
       set booked_seats = booked_seats + 1
     where id = v_req.to_session_id;
  end if;

  update public.course_rebooking_requests
     set status = 'applied', applied_at = now(), seats_held = false
   where id = p_request_id;

  return v_req.booking_id;
end;
$$;

grant execute on function public.apply_course_rebooking(uuid) to service_role;

-- Release a single hold and cancel its request. Used by the reaper for expired
-- requests and by staff who withdraw an Umbuchung before it is paid.
create or replace function public.cancel_course_rebooking(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.course_rebooking_requests%rowtype;
begin
  if not (public.is_staff() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;

  select * into v_req
  from public.course_rebooking_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'REBOOKING_REQUEST_NOT_FOUND';
  end if;

  -- Idempotent: cancelling an applied or already-cancelled request is a no-op.
  if v_req.status <> 'pending' then
    return v_req.booking_id;
  end if;

  if v_req.seats_held then
    -- Give the target seat back.
    update public.course_sessions
       set booked_seats = greatest(booked_seats - 1, 0)
     where id = v_req.to_session_id;

    -- Restore the original seat. UNCLAMPED on purpose: she never paid, so she
    -- is still booked on the original date, and if that seat was resold the
    -- session must show as overbooked rather than quietly drop her.
    if v_req.from_session_id is not null then
      update public.course_sessions
         set booked_seats = booked_seats + 1
       where id = v_req.from_session_id;
    end if;
  end if;

  update public.course_rebooking_requests
     set status = 'cancelled', seats_held = false
   where id = p_request_id;

  return v_req.booking_id;
end;
$$;

revoke execute on function public.cancel_course_rebooking(uuid) from public, anon;
grant execute on function public.cancel_course_rebooking(uuid) to authenticated, service_role;

-- Reap every hold whose deadline passed. Returns one row per released hold so
-- the cron can report them to Slack. Legacy pending requests (seats_held =
-- false, expires_at null) are left alone.
create or replace function public.expire_course_rebooking_requests()
returns table (
  request_id      uuid,
  booking_id      uuid,
  from_session_id uuid,
  to_session_id   uuid,
  overbooked      boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.course_rebooking_requests%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'not authorized';
  end if;

  for v_req in
    select * from public.course_rebooking_requests
    where status = 'pending'
      and seats_held = true
      and expires_at is not null
      and expires_at < now()
    order by expires_at
  loop
    perform public.cancel_course_rebooking(v_req.id);

    request_id      := v_req.id;
    booking_id      := v_req.booking_id;
    from_session_id := v_req.from_session_id;
    to_session_id   := v_req.to_session_id;
    -- Did restoring her original seat push that session past capacity?
    overbooked := coalesce(
      (select s.booked_seats > s.max_seats
         from public.course_sessions s
        where s.id = v_req.from_session_id),
      false);
    return next;
  end loop;
end;
$$;

revoke execute on function public.expire_course_rebooking_requests() from public, anon, authenticated;
grant execute on function public.expire_course_rebooking_requests() to service_role;
