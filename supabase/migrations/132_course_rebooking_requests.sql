-- Gated Umbuchung (rebooking) for Auszubildende course bookings.
--
-- Staff initiate a move in "Kurstermin ändern". When an Umbuchungsgebühr is
-- due (AGB Ziffer 6: 125 EUR 14-7 days, 250 EUR under 7 days before the
-- originally booked start), the move is NOT applied immediately: a pending
-- request is stored and the doctor receives a Stripe payment link. Only once
-- the fee is paid does the Stripe webhook call apply_course_rebooking, which
-- moves the booking and rebalances the seat counts.
--
-- A free move (more than 14 days out) skips this table entirely and updates
-- the booking directly, as before.

create table if not exists public.course_rebooking_requests (
  id                          uuid primary key default gen_random_uuid(),
  booking_id                  uuid not null references public.course_bookings(id) on delete cascade,
  from_session_id             uuid references public.course_sessions(id) on delete set null,
  to_session_id               uuid not null references public.course_sessions(id) on delete cascade,
  fee_cents                   integer not null check (fee_cents > 0),
  stripe_checkout_session_id  text,
  status                      text not null default 'pending'
                                check (status in ('pending', 'applied', 'cancelled')),
  created_by                  uuid references auth.users(id) on delete set null,
  created_at                  timestamptz not null default now(),
  applied_at                  timestamptz
);

create index if not exists course_rebooking_requests_booking_idx
  on public.course_rebooking_requests(booking_id);
create index if not exists course_rebooking_requests_checkout_idx
  on public.course_rebooking_requests(stripe_checkout_session_id);

-- Data API access. Touched only by the admin/service client server-side, but
-- grant authenticated rw so a future staff UI can read request status.
grant select, insert, update, delete on public.course_rebooking_requests to authenticated;
grant select, insert, update, delete on public.course_rebooking_requests to service_role;

alter table public.course_rebooking_requests enable row level security;

drop policy if exists "course_rebooking_requests staff rw" on public.course_rebooking_requests;
create policy "course_rebooking_requests staff rw" on public.course_rebooking_requests
  for all
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Apply a paid rebooking atomically. Idempotent: re-running on an already
-- applied (or cancelled) request is a no-op, so a duplicated Stripe webhook
-- can't move the booking twice or double-count seats.
create or replace function public.apply_course_rebooking(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req   public.course_rebooking_requests%rowtype;
begin
  select * into v_req
  from public.course_rebooking_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'REBOOKING_REQUEST_NOT_FOUND';
  end if;

  -- Already handled: return the booking id without changing anything.
  if v_req.status <> 'pending' then
    return v_req.booking_id;
  end if;

  -- Move the booking to the new session.
  update public.course_bookings
     set session_id = v_req.to_session_id
   where id = v_req.booking_id;

  -- Free the old seat (never below zero) and take a seat in the new session.
  -- The new session bypasses the capacity guard: the doctor already paid the
  -- Kulanz-Umbuchungsgebühr, so the move must succeed even if it is full.
  if v_req.from_session_id is not null then
    update public.course_sessions
       set booked_seats = greatest(booked_seats - 1, 0)
     where id = v_req.from_session_id;
  end if;

  update public.course_sessions
     set booked_seats = booked_seats + 1
   where id = v_req.to_session_id;

  update public.course_rebooking_requests
     set status = 'applied', applied_at = now()
   where id = p_request_id;

  return v_req.booking_id;
end;
$$;

grant execute on function public.apply_course_rebooking(uuid) to service_role;
