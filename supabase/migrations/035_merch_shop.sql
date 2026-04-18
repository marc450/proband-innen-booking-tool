-- Small merch shop: products, per-variant stock, orders. Scoped to the
-- shop exposed at kurse.ephia.de/merch. Keeps its own lineage so it does
-- not tangle with course_bookings.

-- ── Products ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.merch_products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text UNIQUE NOT NULL,
  title        text NOT NULL,
  subtitle     text,
  description  text,
  image_url    text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Variants: one row per (color, size) combo with its own stock. ──
CREATE TABLE IF NOT EXISTS public.merch_product_variants (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         uuid NOT NULL REFERENCES public.merch_products(id) ON DELETE CASCADE,
  name               text NOT NULL,
  -- "Schwarz" | "Beige" | "Weiß" | …  Null for products without colorways.
  color              text,
  -- "one-size" | "S" | "M" | "L" | "XL" | …  Null for products without sizes.
  size               text,
  sku                text UNIQUE,
  -- Prices in cents to match Stripe's unit_amount exactly.
  price_gross_cents  integer NOT NULL,
  vat_rate           numeric(4,3) NOT NULL DEFAULT 0.19,
  stock              integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url          text,
  is_active          boolean NOT NULL DEFAULT true,
  sort_order         integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS merch_product_variants_product_idx
  ON public.merch_product_variants(product_id);

-- ── Orders ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.merch_orders (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id                    uuid REFERENCES public.merch_product_variants(id) ON DELETE SET NULL,
  product_id                    uuid REFERENCES public.merch_products(id) ON DELETE SET NULL,
  -- Snapshot of what was bought (so deleting a variant later does not
  -- break historical orders).
  product_title                 text NOT NULL,
  variant_name                  text,
  variant_color                 text,
  variant_size                  text,
  quantity                      integer NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  -- Customer.
  first_name                    text,
  last_name                     text,
  email                         text NOT NULL,
  phone                         text,
  is_doctor                     boolean NOT NULL DEFAULT false,
  auszubildende_id              uuid REFERENCES public.auszubildende(id) ON DELETE SET NULL,
  -- Shipping address (collected by Stripe Checkout).
  shipping_line1                text,
  shipping_line2                text,
  shipping_postal_code          text,
  shipping_city                 text,
  shipping_country              text,
  -- Money (cents).
  item_gross_cents              integer NOT NULL,
  shipping_gross_cents          integer NOT NULL DEFAULT 0,
  amount_paid_cents             integer NOT NULL,
  -- Stripe.
  stripe_checkout_session_id    text UNIQUE,
  stripe_payment_intent_id      text,
  stripe_invoice_url            text,
  -- Lifecycle.
  status                        text NOT NULL DEFAULT 'paid'
                                  CHECK (status IN ('pending','paid','shipped','cancelled','refunded')),
  tracking_number               text,
  shipped_at                    timestamptz,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS merch_orders_created_at_idx ON public.merch_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS merch_orders_status_idx     ON public.merch_orders(status);
CREATE INDEX IF NOT EXISTS merch_orders_email_idx      ON public.merch_orders(email);
CREATE INDEX IF NOT EXISTS merch_orders_session_idx    ON public.merch_orders(stripe_checkout_session_id);

-- ── RLS: admins/staff only via service role. No public access. ──
ALTER TABLE public.merch_products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merch_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merch_orders           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "merch_products staff rw"          ON public.merch_products;
DROP POLICY IF EXISTS "merch_product_variants staff rw"  ON public.merch_product_variants;
DROP POLICY IF EXISTS "merch_orders staff rw"            ON public.merch_orders;

CREATE POLICY "merch_products staff rw" ON public.merch_products
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "merch_product_variants staff rw" ON public.merch_product_variants
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "merch_orders staff rw" ON public.merch_orders
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ── Seed: the EPHIA Cap. Price = 35,00 EUR gross. Two colorways, one size.
INSERT INTO public.merch_products (slug, title, subtitle, description, is_active)
VALUES (
  'ephia-cap',
  'EPHIA Cap',
  '"SCHATTEN SPART BOTOX"',
  'Unterstütze unsere Mission für evidenzbasierte, patient:innenzentrierte Behandlungen. Mit jeder verkauften EPHIA Cap spenden wir 10 EUR an die Jenny De la Torre-Stiftung für die niedrigschwellige medizinische Versorgung Obdachloser in Berlin.',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Variants (both one-size, 0 stock so admin sets the initial count).
WITH p AS (SELECT id FROM public.merch_products WHERE slug = 'ephia-cap')
INSERT INTO public.merch_product_variants
  (product_id, name, color, size, sku, price_gross_cents, vat_rate, stock, sort_order)
SELECT p.id, 'EPHIA Cap Schwarz', 'Schwarz', 'one-size', 'CAP-SCHWARZ-OS', 3500, 0.19, 0, 0 FROM p
ON CONFLICT (sku) DO NOTHING;

WITH p AS (SELECT id FROM public.merch_products WHERE slug = 'ephia-cap')
INSERT INTO public.merch_product_variants
  (product_id, name, color, size, sku, price_gross_cents, vat_rate, stock, sort_order)
SELECT p.id, 'EPHIA Cap Beige', 'Beige', 'one-size', 'CAP-BEIGE-OS', 3500, 0.19, 0, 1 FROM p
ON CONFLICT (sku) DO NOTHING;

-- ── Stock helper: atomic decrement. Raises OUT_OF_STOCK if insufficient.
-- Called from the Stripe webhook to prevent double-sells.
CREATE OR REPLACE FUNCTION public.merch_decrement_stock(p_variant_id uuid, p_qty integer)
RETURNS void AS $$
DECLARE
  v_stock integer;
BEGIN
  SELECT stock INTO v_stock FROM public.merch_product_variants
    WHERE id = p_variant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VARIANT_NOT_FOUND';
  END IF;
  IF v_stock < p_qty THEN
    RAISE EXCEPTION 'OUT_OF_STOCK';
  END IF;
  UPDATE public.merch_product_variants
    SET stock = stock - p_qty, updated_at = now()
    WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.merch_decrement_stock(uuid, integer) TO service_role;
