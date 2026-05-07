-- 061_v_auszubildende_view.sql
-- Read-side abstraction over auszubildende that always returns the
-- canonical primary email from auszubildende_emails. Once every read
-- site uses this view, we can drop the legacy auszubildende.email
-- column and the 046 sync trigger (062).
--
-- Writes still go through `auszubildende` directly. The view only
-- replaces SELECTs.

CREATE OR REPLACE VIEW public.v_auszubildende AS
SELECT
  a.id,
  a.first_name,
  a.last_name,
  a.title,
  a.gender,
  a.specialty,
  a.birthdate,
  a.efn,
  a.phone,
  a.notes,
  a.status,
  a.contact_type,
  a.company_name,
  a.vat_id,
  a.address_line1,
  a.address_postal_code,
  a.address_city,
  a.address_country,
  a.user_id,
  a.profile_complete,
  a.lw_user_id,
  a.legacy_imported_at,
  a.legacy_source,
  a.created_at,
  a.updated_at,
  ae.email
FROM public.auszubildende a
LEFT JOIN LATERAL (
  SELECT email
  FROM public.auszubildende_emails
  WHERE auszubildende_id = a.id AND is_primary
  LIMIT 1
) ae ON true;

COMMENT ON VIEW public.v_auszubildende IS
  'Auszubildende joined with the canonical primary email from auszubildende_emails. Use for reads; writes still target the auszubildende table directly.';

-- Grant the same access patterns the underlying tables already enforce.
-- RLS on the view inherits from the joined tables, so authenticated staff
-- continue to see what they always saw.
GRANT SELECT ON public.v_auszubildende TO authenticated;
GRANT SELECT ON public.v_auszubildende TO service_role;
