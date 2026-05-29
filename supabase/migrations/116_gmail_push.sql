-- Gmail Push Notifications via Google Pub/Sub.
--
-- Replaces the 5-minute polling cron with a real-time push pipeline:
-- Gmail publishes to a Pub/Sub topic whenever a new INBOX message
-- arrives, Pub/Sub forwards the notification to /api/gmail/push-webhook,
-- the webhook calls users.history.list({startHistoryId}) to fetch the
-- new messages and runs the Slack-notify + auto-reply logic on each.
--
-- Watches expire after at most 7 days, so a daily renewal cron keeps
-- the watch alive. Both the watch start-history-id (returned by
-- users.watch) and the last-processed-history-id (advanced after each
-- push batch) are persisted on the gmail_tokens row.

alter table public.gmail_tokens
  add column if not exists watch_history_id text,
  add column if not exists watch_expiration timestamptz,
  add column if not exists last_processed_history_id text;

comment on column public.gmail_tokens.watch_history_id is
  'historyId returned by users.watch(). The first checkpoint after a fresh watch — used as startHistoryId until the first push notification advances last_processed_history_id.';

comment on column public.gmail_tokens.watch_expiration is
  'Wall-clock expiration of the current Gmail watch (max 7 days). Renewed daily by /api/cron/gmail-watch-renew.';

comment on column public.gmail_tokens.last_processed_history_id is
  'Most recent historyId we have fully processed. Used as startHistoryId in the next users.history.list call so we never miss or replay messages.';
