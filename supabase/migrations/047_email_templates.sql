-- 047_email_templates.sql
-- Reusable email templates for the customerlove inbox compose flow.
-- Admins manage templates from /dashboard/email-templates and can later
-- insert them into the inbox compose view.

create extension if not exists "pgcrypto";

create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null default '',
  body_html text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_email_templates_name_lower
  on email_templates (lower(name));

create or replace function update_email_templates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_email_templates_updated_at on email_templates;
create trigger trg_email_templates_updated_at
  before update on email_templates
  for each row execute function update_email_templates_updated_at();

-- All writes happen via the service-role admin client, so we only need
-- a read policy for authenticated users. Picking templates from the
-- compose view should work for any logged-in admin.
alter table email_templates enable row level security;

drop policy if exists "Authenticated users can read email_templates" on email_templates;
create policy "Authenticated users can read email_templates"
  on email_templates for select to authenticated using (true);
