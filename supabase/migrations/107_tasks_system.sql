-- Tasks system for the admin tool. Staff (admin/nutzer) can CRUD tasks,
-- assign them to other staff, write notes, attach files, and link a
-- course session. All staff see all tasks (team board).

-- ---------------------------------------------------------------------------
-- Storage bucket for task attachments (private; access via signed URLs)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'done')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  course_session_id uuid references public.course_sessions(id) on delete set null,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_assigned_to_idx on public.tasks(assigned_to);
create index tasks_status_idx on public.tasks(status);
create index tasks_course_session_id_idx on public.tasks(course_session_id);
create index tasks_due_date_idx on public.tasks(due_date);

-- ---------------------------------------------------------------------------
-- task_notes
-- ---------------------------------------------------------------------------
create table public.task_notes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index task_notes_task_id_idx on public.task_notes(task_id);

-- ---------------------------------------------------------------------------
-- task_attachments (metadata; bytes live in storage bucket task-attachments)
-- ---------------------------------------------------------------------------
create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  file_name text not null,
  file_size bigint,
  mime_type text,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index task_attachments_task_id_idx on public.task_attachments(task_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger on tasks
-- ---------------------------------------------------------------------------
create or replace function public.tasks_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at_trg
before update on public.tasks
for each row execute function public.tasks_set_updated_at();

-- ---------------------------------------------------------------------------
-- GRANTs (per CLAUDE.md rule: every new table needs explicit grants)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.tasks to service_role;

grant select, insert, update, delete on public.task_notes to authenticated;
grant select, insert, update, delete on public.task_notes to service_role;

grant select, insert, update, delete on public.task_attachments to authenticated;
grant select, insert, update, delete on public.task_attachments to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.tasks enable row level security;
alter table public.task_notes enable row level security;
alter table public.task_attachments enable row level security;

-- Staff (admin / nutzer) have full access. Students (LW SSO customers) do not.
create policy "Staff full access tasks" on public.tasks
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

create policy "Staff full access task_notes" on public.task_notes
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

create policy "Staff full access task_attachments" on public.task_attachments
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

-- ---------------------------------------------------------------------------
-- Storage RLS for the task-attachments bucket
-- ---------------------------------------------------------------------------
-- The Next.js API route uses the service-role client for uploads/downloads
-- (signed URLs), so these policies primarily defend against direct calls
-- from the browser anon key. Restrict everything to staff.
drop policy if exists "Staff read task attachments" on storage.objects;
create policy "Staff read task attachments" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'task-attachments'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'nutzer')
    )
  );

drop policy if exists "Staff upload task attachments" on storage.objects;
create policy "Staff upload task attachments" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'task-attachments'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'nutzer')
    )
  );

drop policy if exists "Staff delete task attachments" on storage.objects;
create policy "Staff delete task attachments" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'task-attachments'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'nutzer')
    )
  );
