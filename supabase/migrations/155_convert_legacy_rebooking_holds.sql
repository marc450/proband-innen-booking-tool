-- 155: One-off data fix — move Tara Khaffaf's open Umbuchung onto the seat-hold
-- model introduced in 154.
--
-- Her request (created 2026-07-09, 250 € Umbuchungsgebühr, 12. Juli -> 13. Sept)
-- predates 154, so it carries seats_held = false: it holds nothing, never
-- expires, and is invisible in the new staff UI, which was the whole point of
-- the change (Jana asked to SEE that a rebooking is started but not paid).
-- Converting it takes the hold properly:
--
--   * 13. Sept  +1  — her seat is reserved instead of sellable from under her
--   * 12. Juli  -1  — released; that course has already happened, so this only
--                     corrects a stale counter
--   * expires_at = now() + 7 days — the reaper releases it if she never pays
--
-- Her emailed payment link keeps working (it points at our own page, which
-- mints a fresh Stripe session per visit), so no new email is sent.
--
-- Deliberately NOT converted: Tobias Kliesener's request 08562779 (129 €,
-- 31. Mai -> 29. Nov). His booking already sits on the target session while the
-- request was never applied, so it is leftover from a move completed by other
-- means. Converting it would hold a seat he already occupies. Its fate is a
-- billing question for Jana, who created it — left pending and untouched here.
--
-- Idempotent + guarded: only fires while the row is still pending and unheld,
-- so re-running it (or running it after she has paid) does nothing.

do $$
declare
  v_req public.course_rebooking_requests%rowtype;
begin
  select * into v_req
  from public.course_rebooking_requests
  where id = '049f5a5d-ac49-4bb8-bd31-af274295cafb'
    and status = 'pending'
    and seats_held = false
  for update;

  if not found then
    raise notice '155: request already applied, cancelled or converted — nothing to do';
    return;
  end if;

  update public.course_rebooking_requests
     set seats_held = true,
         expires_at = now() + interval '7 days'
   where id = v_req.id;

  -- Free the original seat (past course; corrects the counter only).
  if v_req.from_session_id is not null then
    update public.course_sessions
       set booked_seats = greatest(booked_seats - 1, 0)
     where id = v_req.from_session_id;
  end if;

  -- Hold the target seat. Unclamped, matching create_course_rebooking_request.
  update public.course_sessions
     set booked_seats = booked_seats + 1
   where id = v_req.to_session_id;

  raise notice '155: converted request % to a seat hold until %',
    v_req.id, (now() + interval '7 days');
end $$;
