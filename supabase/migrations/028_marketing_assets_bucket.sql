-- Public bucket for marketing assets (hero videos, posters, tile images, etc.)
-- used by the shadow marketing site at kurse.ephia.de.
--
-- We keep these OUT of the git repo so large binaries don't bloat clone times
-- and so Marc can drop new assets in via the Supabase dashboard without a
-- redeploy. Anything in this bucket is world-readable; do not store anything
-- sensitive here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketing-assets',
  'marketing-assets',
  true,
  209715200, -- 200 MB per file, headroom for 1080p hero videos
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read, authenticated writes. The bucket is public so anyone can
-- fetch a URL once they know it; write/delete stays locked down to staff
-- users authenticated against Supabase.

drop policy if exists "Public can read marketing-assets" on storage.objects;
create policy "Public can read marketing-assets"
  on storage.objects for select
  using (bucket_id = 'marketing-assets');

drop policy if exists "Authenticated can write marketing-assets" on storage.objects;
create policy "Authenticated can write marketing-assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'marketing-assets');

drop policy if exists "Authenticated can update marketing-assets" on storage.objects;
create policy "Authenticated can update marketing-assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'marketing-assets')
  with check (bucket_id = 'marketing-assets');

drop policy if exists "Authenticated can delete marketing-assets" on storage.objects;
create policy "Authenticated can delete marketing-assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'marketing-assets');
