-- Manual "Als beantwortet markieren" für die Admin-Inbox. Gmail
-- selbst kennt keinen "handled" Zustand, also speichern wir das
-- hier. Das Tabellen-Schema bleibt bewusst simpel: ein Eintrag pro
-- Gmail-Thread-ID, mit Benutzer-Referenz für Audit und einem
-- Display-Namen-Snapshot, damit das grüne Pill in der Liste den
-- Namen auch dann noch zeigen kann, wenn der markierende Staff-User
-- später deaktiviert oder umbenannt wird.

create table public.inbox_thread_marks (
  thread_id text primary key,
  marked_by_user_id uuid references auth.users(id) on delete set null,
  marked_by_name text not null,
  marked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Data API access. Admin-only table; anon never touches it.
grant select, insert, update, delete on public.inbox_thread_marks to authenticated;
grant select, insert, update, delete on public.inbox_thread_marks to service_role;

alter table public.inbox_thread_marks enable row level security;

create policy "Authenticated staff can read marks"
  on public.inbox_thread_marks
  for select
  to authenticated
  using (true);

create policy "Authenticated staff can insert marks"
  on public.inbox_thread_marks
  for insert
  to authenticated
  with check (true);

create policy "Authenticated staff can delete marks"
  on public.inbox_thread_marks
  for delete
  to authenticated
  using (true);
