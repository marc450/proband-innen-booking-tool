-- EPHIA Booking System Schema

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Enum for booking status
create type booking_status as enum ('booked', 'attended', 'no_show', 'cancelled');

-- Courses table
create table courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Slots table
create table slots (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  capacity int not null default 1 check (capacity > 0),
  created_at timestamptz not null default now()
);

-- Bookings table
create table bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references slots(id) on delete cascade,
  name text not null,
  email text not null,
  stripe_customer_id text,
  stripe_payment_method_id text,
  status booking_status not null default 'booked',
  charge_id text, -- Stripe PaymentIntent ID if no-show charged
  created_at timestamptz not null default now(),
  -- Prevent duplicate bookings: same email + slot
  unique (slot_id, email)
);

-- Index for querying bookings by slot
create index idx_bookings_slot_id on bookings(slot_id);
create index idx_bookings_email on bookings(email);
create index idx_bookings_status on bookings(status);
create index idx_slots_course_id on slots(course_id);

-- View: available slots with remaining capacity
create or replace view available_slots as
select
  s.*,
  c.title as course_title,
  c.description as course_description,
  s.capacity - coalesce(
    (select count(*) from bookings b
     where b.slot_id = s.id
     and b.status in ('booked', 'attended')),
    0
  ) as remaining_capacity
from slots s
join courses c on c.id = s.course_id;

-- RLS Policies

alter table courses enable row level security;
alter table slots enable row level security;
alter table bookings enable row level security;

-- Courses: anyone can read, only authenticated staff can modify
create policy "Anyone can view courses"
  on courses for select
  using (true);

create policy "Staff can insert courses"
  on courses for insert
  to authenticated
  with check (true);

create policy "Staff can update courses"
  on courses for update
  to authenticated
  using (true);

create policy "Staff can delete courses"
  on courses for delete
  to authenticated
  using (true);

-- Slots: anyone can read, only staff can modify
create policy "Anyone can view slots"
  on slots for select
  using (true);

create policy "Staff can insert slots"
  on slots for insert
  to authenticated
  with check (true);

create policy "Staff can update slots"
  on slots for update
  to authenticated
  using (true);

create policy "Staff can delete slots"
  on slots for delete
  to authenticated
  using (true);

-- Bookings: public can insert, only staff can read/update/delete
create policy "Public can insert bookings"
  on bookings for insert
  to anon
  with check (true);

create policy "Staff can view all bookings"
  on bookings for select
  to authenticated
  using (true);

create policy "Staff can update bookings"
  on bookings for update
  to authenticated
  using (true);

create policy "Staff can delete bookings"
  on bookings for delete
  to authenticated
  using (true);

-- Allow service_role full access (for edge functions)
-- service_role bypasses RLS by default

-- Grant access to the available_slots view for anon
grant select on available_slots to anon;
grant select on available_slots to authenticated;
