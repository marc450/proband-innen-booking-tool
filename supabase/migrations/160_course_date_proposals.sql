-- Dozent:innen course-date coordination.
--
-- Lets admins post open practice-course dates ("proposals") that
-- Dozent:innen can apply to from inside the admin dashboard. Admin then
-- picks one applicant and confirms; the confirm flow (in
-- /api/kursplanung/confirm) creates a real course_sessions row set to
-- is_live = false (offline by default) with the selected Dozent:in as
-- instructor, and spawns the Proband:innen satellite via
-- createSatelliteForSession. These two tables only hold the coordination
-- state; no course machinery lives here.

create table if not exists public.course_date_proposals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Which course this open date is for.
  template_id uuid not null references public.course_templates(id) on delete cascade,
  -- The proposed calendar date + logistics the confirmed session inherits.
  proposed_date date not null,
  start_time text not null default '10:00',
  duration_minutes integer not null default 360,
  max_seats integer not null default 5,
  address text,
  notes text,
  -- 'open' → accepting applications, 'confirmed' → a Dozent:in was picked
  -- and the offline session was created, 'cancelled' → withdrawn by admin.
  status text not null default 'open'
    check (status in ('open', 'confirmed', 'cancelled')),
  -- Set on confirm: the Dozent:in profile chosen and the session created.
  assigned_profile_id uuid references public.profiles(id) on delete set null,
  created_session_id uuid references public.course_sessions(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null
);

comment on table public.course_date_proposals is
  'Open practice-course dates admins post for Dozent:innen to apply to. Confirming one creates an offline course_sessions row + Proband:innen satellite.';

create table if not exists public.course_date_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  proposal_id uuid not null references public.course_date_proposals(id) on delete cascade,
  -- The Dozent:in (profiles row) raising their hand.
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- 'applied' → hand raised, 'selected' → picked on confirm, 'declined' →
  -- another applicant was picked, 'withdrawn' → Dozent:in took it back.
  status text not null default 'applied'
    check (status in ('applied', 'selected', 'declined', 'withdrawn')),
  note text,
  -- One row per (proposal, Dozent:in). Many Dozent:innen may apply to one
  -- proposal and one Dozent:in may apply to many proposals (double
  -- bookings allowed); this only blocks applying twice to the same date.
  unique (proposal_id, profile_id)
);

comment on table public.course_date_applications is
  'A Dozent:in applying to run a proposed course date. Unique per (proposal, Dozent:in).';

-- Data API access. All writes go through the service-role admin client in
-- /api/kursplanung/* (which bypasses RLS and validates the caller via
-- @/lib/auth-verify); staff read these tables in the dashboard. No anon.
grant select on public.course_date_proposals to authenticated;
grant select, insert, update, delete on public.course_date_proposals to service_role;

grant select on public.course_date_applications to authenticated;
grant select, insert, update, delete on public.course_date_applications to service_role;

alter table public.course_date_proposals enable row level security;
alter table public.course_date_applications enable row level security;

-- Staff-only read (admin/nutzer). Dozent:innen are staff, so this also
-- covers the apply surface's reads. Writes never use the authenticated
-- role, so no insert/update policy is needed; service_role bypasses RLS.
create policy "course_date_proposals staff read"
  on public.course_date_proposals
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'nutzer')
    )
  );

create policy "course_date_applications staff read"
  on public.course_date_applications
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'nutzer')
    )
  );

create index if not exists idx_course_date_proposals_status
  on public.course_date_proposals (status, proposed_date);
create index if not exists idx_course_date_applications_proposal
  on public.course_date_applications (proposal_id);
create index if not exists idx_course_date_applications_profile
  on public.course_date_applications (profile_id);
