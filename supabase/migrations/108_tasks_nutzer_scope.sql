-- Scope nutzer to only the tasks they are assigned to. Admins keep
-- full access. Nutzer can change status, write notes, and manage
-- attachments on their assigned tasks; they cannot create, delete,
-- reassign, or edit the task definition.

-- ---------------------------------------------------------------------------
-- Drop the open "staff full access" policies from migration 107
-- ---------------------------------------------------------------------------
drop policy if exists "Staff full access tasks" on public.tasks;
drop policy if exists "Staff full access task_notes" on public.task_notes;
drop policy if exists "Staff full access task_attachments" on public.task_attachments;

-- ---------------------------------------------------------------------------
-- tasks: admin = full, nutzer = SELECT/UPDATE on own assigned only
-- ---------------------------------------------------------------------------
create policy "Tasks: admin full" on public.tasks
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Tasks: nutzer select assigned" on public.tasks
  for select to authenticated
  using (
    assigned_to = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'nutzer'
    )
  );

-- Nutzer can update their assigned tasks but cannot reassign them
-- (WITH CHECK keeps assigned_to = self after the update).
create policy "Tasks: nutzer update assigned" on public.tasks
  for update to authenticated
  using (
    assigned_to = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'nutzer'
    )
  )
  with check (
    assigned_to = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'nutzer'
    )
  );

-- No INSERT / DELETE policy for nutzer: only admins create/delete tasks.

-- ---------------------------------------------------------------------------
-- task_notes: admin = full, nutzer = access only on tasks assigned to them
-- ---------------------------------------------------------------------------
create policy "Notes: admin full" on public.task_notes
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Notes: nutzer on assigned tasks" on public.task_notes
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'nutzer'
    )
    and exists (
      select 1 from public.tasks
      where tasks.id = task_notes.task_id
        and tasks.assigned_to = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'nutzer'
    )
    and exists (
      select 1 from public.tasks
      where tasks.id = task_notes.task_id
        and tasks.assigned_to = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- task_attachments: same model as notes
-- ---------------------------------------------------------------------------
create policy "Attachments: admin full" on public.task_attachments
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Attachments: nutzer on assigned tasks" on public.task_attachments
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'nutzer'
    )
    and exists (
      select 1 from public.tasks
      where tasks.id = task_attachments.task_id
        and tasks.assigned_to = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'nutzer'
    )
    and exists (
      select 1 from public.tasks
      where tasks.id = task_attachments.task_id
        and tasks.assigned_to = auth.uid()
    )
  );
