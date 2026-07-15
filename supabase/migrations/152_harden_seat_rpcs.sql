-- 152: Harden the seat-adjustment RPCs.
--
-- increment_booked_seats / decrement_booked_seats are SECURITY DEFINER
-- (run as owner, bypass RLS) and were EXECUTE-able by `anon`, so anyone
-- with the public anon key could rewrite booked_seats on any session
-- (make a full course look open = oversell, or a free course look full =
-- booking DoS). They also had no fixed search_path.
--
-- They are legitimately called from the staff dashboard (authenticated
-- staff, via the browser client) and from cancel-course-booking
-- (service_role). So: keep EXECUTE for those, revoke anon, and gate the
-- body to staff-or-service_role using is_staff() (migration 151).

create or replace function public.decrement_booked_seats(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_staff() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;
  update course_sessions
  set booked_seats = greatest(booked_seats - 1, 0)
  where id = p_session_id;
end;
$$;

create or replace function public.increment_booked_seats(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_staff() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;
  update course_sessions
  set booked_seats = least(booked_seats + 1, max_seats)
  where id = p_session_id;
end;
$$;

-- create or replace keeps the old grants, so explicitly revoke anon and
-- re-grant only the roles that should call these.
revoke execute on function public.decrement_booked_seats(uuid) from public, anon;
revoke execute on function public.increment_booked_seats(uuid) from public, anon;
grant execute on function public.decrement_booked_seats(uuid) to authenticated, service_role;
grant execute on function public.increment_booked_seats(uuid) to authenticated, service_role;
