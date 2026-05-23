-- Slack notifications for the task system.
--
-- We notify via the existing incoming webhook channel post (no bot
-- token available on this Slack workspace tier). To DM the right
-- person, the channel message uses an @-mention with the user's
-- Slack member ID (`<@U12345>`). Each staff member's Slack ID gets
-- stored in profiles.slack_user_id and is set by admins in the
-- Benutzer:innen-Verwaltung.
--
-- `tasks.assigned_by` tracks who set the current assignee so that
-- status-change notifications can be routed back to the right person.
-- It defaults to created_by on insert (handled in the API route).

alter table public.profiles
  add column if not exists slack_user_id text;

alter table public.tasks
  add column if not exists assigned_by uuid
    references public.profiles(id) on delete set null;

create index if not exists tasks_assigned_by_idx on public.tasks(assigned_by);
