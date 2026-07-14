-- Lead capture for the "Termin-Updates erhalten" modal on the course
-- landing pages. Replaces the old HubSpot signup (EPHIA no longer uses
-- HubSpot; we rely on our own system). Anonymous visitors submit their
-- name + email to be notified when new course dates open.

create table if not exists public.termin_update_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text,
  first_name text not null,
  last_name text not null,
  email text not null,
  source_url text,
  notified boolean not null default false
);

-- Data API access. The public form writes go through the service-role
-- admin client (which bypasses RLS); staff read the leads in the
-- dashboard. No anon access: these are PII lead records.
grant select on public.termin_update_leads to authenticated;
grant select, insert, update, delete on public.termin_update_leads to service_role;

alter table public.termin_update_leads enable row level security;

-- Staff-only read (admin/nutzer), same role check the tasks system uses.
-- Writes never use the authenticated role, so no insert/update policy is
-- needed; service_role bypasses RLS.
create policy "termin_update_leads staff read"
  on public.termin_update_leads
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'nutzer')
    )
  );

create index if not exists idx_termin_update_leads_created_at
  on public.termin_update_leads (created_at desc);
