-- Let nutzer fully CRUD their own tasks. Admins keep full access.
-- Nutzer can create tasks (auto-assigned to themselves) and delete
-- tasks where they are the assignee. UPDATE was already permitted on
-- assigned tasks in migration 108; reassigning stays blocked because
-- the WITH CHECK keeps assigned_to = auth.uid().

create policy "Tasks: nutzer insert self-assigned" on public.tasks
  for insert to authenticated
  with check (
    assigned_to = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'nutzer'
    )
  );

create policy "Tasks: nutzer delete assigned" on public.tasks
  for delete to authenticated
  using (
    assigned_to = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'nutzer'
    )
  );
