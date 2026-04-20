-- Email drafts: reliability fixes
--   1. Create the `draft-images` storage bucket (referenced by useDrafts for
--      inline image uploads). Missing bucket was the main reason drafts with
--      pasted screenshots silently failed to persist.
--   2. Add a deterministic `conflict_key` so PostgREST's upsert can target a
--      single unique index instead of racing SELECT-then-INSERT against two
--      partial unique indexes.

-- ── 1. Storage bucket ──────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'draft-images',
  'draft-images',
  true,
  10485760, -- 10 MB per image; images in the inbox composer are typically small screenshots
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read draft-images" on storage.objects;
create policy "Public can read draft-images"
  on storage.objects for select
  using (bucket_id = 'draft-images');

drop policy if exists "Authenticated can write draft-images" on storage.objects;
create policy "Authenticated can write draft-images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'draft-images');

drop policy if exists "Authenticated can update draft-images" on storage.objects;
create policy "Authenticated can update draft-images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'draft-images')
  with check (bucket_id = 'draft-images');

drop policy if exists "Authenticated can delete draft-images" on storage.objects;
create policy "Authenticated can delete draft-images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'draft-images');

-- ── 2. Deterministic conflict key for atomic upsert ────────────────────────
--
-- The partial unique indexes on `email_drafts` (one per user for kind='compose',
-- one per (user, thread) for kind='reply') are fragile via PostgREST's upsert.
-- A generated column gives us a single plain UNIQUE index covering both cases.

alter table email_drafts
  add column if not exists conflict_key text
  generated always as (
    user_id::text || ':' || kind || ':' || coalesce(thread_id, '')
  ) stored;

create unique index if not exists uq_email_drafts_conflict_key
  on email_drafts (conflict_key);
