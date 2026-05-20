-- 105_campaign_sent_by.sql
--
-- Adds sender attribution to email_campaigns.
--
-- Background: until now /api/send-campaign used the admin client only
-- and never recorded which staff member triggered the send. The
-- campaigns dashboard couldn't tell who sent each campaign at a
-- glance.
--
-- We capture the auth.users id at send / schedule time (set via
-- createClient().auth.getUser() in the route). The dashboard joins
-- this to public.profiles for first_name + last_name.
--
-- Nullable on purpose: existing rows stay null, and a service-role
-- triggered send (e.g. scheduled-tasks runner) likewise leaves it
-- null without breaking the insert.

-- Reference public.profiles(id) instead of auth.users(id) so PostgREST
-- exposes the relation directly (the dashboard list uses the same
-- "profiles!<column>" join syntax that the courses.instructor_id FK
-- already uses). profiles.id is 1:1 with auth.users.id via the
-- profile-on-signup trigger so this still points at the right row.
alter table public.email_campaigns
  add column if not exists sent_by_user_id uuid references public.profiles(id) on delete set null;

create index if not exists email_campaigns_sent_by_user_id_idx
  on public.email_campaigns(sent_by_user_id);
