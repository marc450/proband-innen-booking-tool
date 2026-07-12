-- merch_orders.pickup_at_event was added to the live DB out of band when the
-- community-event pickup shipped, but never landed as a migration. This file
-- brings the repo in sync so fresh environments (and any project rebuilt from
-- migrations) get the column. Idempotent: a no-op where the column already
-- exists.
--
-- Semantics: true = the buyer chose pickup instead of shipping, so no delivery
-- fee was charged (shipping_gross_cents = 0) and no shipping address collected.
-- Originally "Abholung beim Community Event", now the always-available
-- "Abholung im Kurs" option.

alter table public.merch_orders
  add column if not exists pickup_at_event boolean not null default false;
