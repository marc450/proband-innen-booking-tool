-- Cross-course Umbuchung: allow a gated rebooking to move a booking not just to
-- another date of the SAME course, but to a DIFFERENT course template
-- (e.g. Grundkurs Botulinum -> Aufbaukurs Therapeutische Indikationen).
--
-- The doctor pays the AGB Ziffer 6 Umbuchungsgebühr (0/125/250 €, staffed by how
-- close the move is to the originally booked date) PLUS an Aufpreis when the
-- target course is more expensive than what was originally paid. Downgrades are
-- never refunded (the Aufpreis is clamped at >= 0).
--
-- On apply we therefore also switch the booking's template_id + course_type.
-- We deliberately do NOT touch amount_paid: the cancel-refund path credit-notes
-- the booking's ORIGINAL invoice for amount_paid, but the Umbuchungsgebühr +
-- Aufpreis are charged on a SEPARATE Stripe invoice. Bumping amount_paid would
-- make a later credit note exceed the original invoice total and Stripe would
-- reject it, breaking cancellation. So amount_paid keeps the original course
-- price; the Umbuchungsgebühr and Aufpreis are non-refundable on cancel (staff
-- can refund the rebooking invoice manually if ever needed).

alter table public.course_rebooking_requests
  add column if not exists to_template_id  uuid references public.course_templates(id) on delete set null,
  add column if not exists to_course_type  text,
  add column if not exists surcharge_cents integer not null default 0
    check (surcharge_cents >= 0);

-- Relax the fee check from "> 0" to ">= 0". A cross-course move can carry a 0 €
-- Umbuchungsgebühr (more than 14 days out) while still charging an Aufpreis, and
-- a same-price free move stores 0/0 and is applied immediately. The total
-- (fee + surcharge) being positive is enforced in application logic, not here.
alter table public.course_rebooking_requests
  drop constraint if exists course_rebooking_requests_fee_cents_check;
alter table public.course_rebooking_requests
  add constraint course_rebooking_requests_fee_cents_check check (fee_cents >= 0);

-- Rewrite the apply RPC to carry the course + type change when a target
-- template is present. Still idempotent (re-running on a non-pending request is
-- a no-op) and still bypasses the target session's capacity guard: the doctor
-- already paid, so the move must succeed even if the new session is full.
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

  -- Already handled: return the booking id without changing anything.
  if v_req.status <> 'pending' then
    return v_req.booking_id;
  end if;

  -- Move the booking to the new session. When the move also crosses courses,
  -- switch the template + course_type. amount_paid is intentionally left as-is
  -- (see header note on the cancel-refund invoice mismatch).
  if v_req.to_template_id is not null then
    update public.course_bookings
       set session_id  = v_req.to_session_id,
           template_id  = v_req.to_template_id,
           course_type  = coalesce(v_req.to_course_type, course_type)
     where id = v_req.booking_id;
  else
    update public.course_bookings
       set session_id = v_req.to_session_id
     where id = v_req.booking_id;
  end if;

  -- Free the old seat (never below zero) and take a seat in the new session.
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
