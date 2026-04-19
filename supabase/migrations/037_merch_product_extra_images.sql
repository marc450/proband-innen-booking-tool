-- Up to three images per merch product. image_url stays the primary hero;
-- image_url_2 and image_url_3 are optional additional angles that appear as
-- thumbnails on /merch/[slug]. All nullable so existing rows keep working.

ALTER TABLE public.merch_products
  ADD COLUMN IF NOT EXISTS image_url_2 TEXT;

ALTER TABLE public.merch_products
  ADD COLUMN IF NOT EXISTS image_url_3 TEXT;
