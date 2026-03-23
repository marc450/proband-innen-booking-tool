-- Add new fields to bookings table
alter table bookings add column if not exists first_name text;
alter table bookings add column if not exists last_name text;
alter table bookings add column if not exists phone text;
alter table bookings add column if not exists address_street text;
alter table bookings add column if not exists address_zip text;
alter table bookings add column if not exists address_city text;
alter table bookings add column if not exists stripe_checkout_session_id text;

-- Migrate existing 'name' data into first_name (best effort)
update bookings set first_name = name where first_name is null and name is not null;

-- Update the available_slots view to include course_date
drop view if exists available_slots;
create or replace view available_slots as
select
  s.id,
  s.course_id,
  s.start_time,
  s.end_time,
  s.capacity,
  s.created_at,
  c.title as course_title,
  c.description as course_description,
  c.course_date,
  s.capacity - coalesce(
    (select count(*) from bookings b
     where b.slot_id = s.id and b.status in ('booked', 'attended')),
    0
  ) as remaining_capacity
from slots s
join courses c on c.id = s.course_id;

-- Grant access to the view
grant select on available_slots to anon, authenticated;
