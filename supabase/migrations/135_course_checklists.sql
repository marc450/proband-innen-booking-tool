-- 135_course_checklists.sql
-- Kursbetreuung checklist: one shared checklist per Auszubildende course
-- session (course_sessions). The item labels/phases/order live in code
-- (src/lib/course-checklist.ts); this table only stores the *state* of
-- each item per session (checked / by whom / when). Rows are created
-- lazily on first tick via upsert on (course_session_id, item_key).

create table if not exists public.course_checklist_items (
  id uuid primary key default gen_random_uuid(),
  course_session_id uuid not null references public.course_sessions(id) on delete cascade,
  item_key text not null,
  checked boolean not null default false,
  checked_by uuid references public.profiles(id) on delete set null,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (course_session_id, item_key)
);

create index if not exists course_checklist_items_session_idx
  on public.course_checklist_items(course_session_id);

-- Data API access. Staff-only (no PII here, but keep it behind auth).
-- No grant to anon.
grant select, insert, update, delete on public.course_checklist_items to authenticated;
grant select, insert, update, delete on public.course_checklist_items to service_role;

alter table public.course_checklist_items enable row level security;

-- Any staff member (admin or nutzer) may read and tick items. The
-- checklist is shared per course, so there is no per-assignee scoping
-- like the tasks table has.
create policy "Checklist: staff full" on public.course_checklist_items
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'nutzer')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'nutzer')
    )
  );
