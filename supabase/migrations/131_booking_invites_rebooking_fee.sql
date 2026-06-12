-- Umbuchung (rebooking) support for booking_invites.
--
-- When set, the public checkout charges exactly this fixed amount (in cents)
-- instead of the course variant price, and any attached promotion code is
-- ignored. This is how a Kulanz-Umbuchung per AGB Ziffer 6 is billed:
-- a flat 125 EUR (14 to 7 days before start) or 250 EUR (under 7 days),
-- independent of which variant (Praxis/Kombi/Premium) the doctor holds.
--
-- NULL = a normal invite (full variant price, optional promo code).

ALTER TABLE public.booking_invites
  ADD COLUMN IF NOT EXISTS rebooking_fee_cents integer
    CHECK (rebooking_fee_cents IS NULL OR rebooking_fee_cents >= 0);

COMMENT ON COLUMN public.booking_invites.rebooking_fee_cents IS
  'When set, checkout charges this flat amount (cents) as an Umbuchungsgebuehr instead of the variant price; promo code is ignored. NULL = normal full-price invite.';
