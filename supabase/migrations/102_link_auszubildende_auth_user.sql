-- 102_link_auszubildende_auth_user.sql
-- Auto-link auszubildende.user_id to auth.users whenever either side
-- appears. Without this, a user who registers an auth account before
-- their contact row exists (or vice versa) stays orphaned: admin shows
-- "Login-Status: Nicht aktiviert" and /kurse/mein-konto returns no
-- contact, no name ("Hi Du"), and no bookings, even though both rows
-- exist with the same email.
--
-- Two triggers cover both creation orders:
--   1) On auszubildende_emails insert/update -> look for matching auth user
--   2) On auth.users insert/update of email  -> look for matching contact
--
-- Both are idempotent: they only act when auszubildende.user_id is null,
-- and they match on lower(email) so case drift between tables is tolerated.

create or replace function public.link_auszubildende_to_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_id uuid;
  v_current_user_id uuid;
begin
  select user_id into v_current_user_id
  from public.auszubildende
  where id = NEW.auszubildende_id;

  if v_current_user_id is not null then
    return NEW;
  end if;

  select id into v_auth_id
  from auth.users
  where lower(email) = lower(NEW.email)
  order by created_at asc
  limit 1;

  if v_auth_id is not null then
    update public.auszubildende
    set user_id = v_auth_id
    where id = NEW.auszubildende_id and user_id is null;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_link_auszubildende_to_auth_user
  on public.auszubildende_emails;

create trigger trg_link_auszubildende_to_auth_user
  after insert or update of email on public.auszubildende_emails
  for each row execute function public.link_auszubildende_to_auth_user();

create or replace function public.link_auth_user_to_auszubildende()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.auszubildende a
  set user_id = NEW.id
  where a.user_id is null
    and a.id in (
      select auszubildende_id
      from public.auszubildende_emails
      where lower(email) = lower(NEW.email)
    );
  return NEW;
end;
$$;

drop trigger if exists trg_link_auth_user_to_auszubildende
  on auth.users;

create trigger trg_link_auth_user_to_auszubildende
  after insert or update of email on auth.users
  for each row execute function public.link_auth_user_to_auszubildende();
