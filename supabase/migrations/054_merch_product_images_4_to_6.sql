-- Extends merch_products from 3 image slots to 6. Same nullable-text
-- column pattern as image_url_2 / image_url_3 from migration 037.
-- All optional so existing rows keep rendering with however many
-- images they currently have.

ALTER TABLE public.merch_products
  ADD COLUMN IF NOT EXISTS image_url_4 TEXT;

ALTER TABLE public.merch_products
  ADD COLUMN IF NOT EXISTS image_url_5 TEXT;

ALTER TABLE public.merch_products
  ADD COLUMN IF NOT EXISTS image_url_6 TEXT;
