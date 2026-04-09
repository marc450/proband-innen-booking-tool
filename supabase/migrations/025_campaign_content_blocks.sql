-- Add content_blocks jsonb column to persist full campaign content (text + images + buttons)
alter table email_campaigns add column if not exists content_blocks jsonb;

-- Also add name column if missing (used by campaign composer)
alter table email_campaigns add column if not exists name text;
