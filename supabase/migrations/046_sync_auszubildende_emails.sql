-- The multi-email manager UI lists rows from auszubildende_emails, but
-- the original 044_multi_email_contacts backfill only seeded the
-- contacts that existed at that moment. Every code path since then
-- (Stripe webhook upsert, /api/import-auszubildende, the inline email
-- editor on the auszubildende detail page, /api/complete-profile)
-- writes only to auszubildende.email, so newer contacts looked
-- "without email" in the manager modal even though their primary
-- address is sitting on the legacy column.
--
-- Three steps:
--   1. Re-run the backfill, idempotent.
--   2. Promote the legacy address to primary if a row exists but
--      nothing is currently flagged primary for that contact.
--   3. Add a trigger so future writes to auszubildende.email mirror
--      into auszubildende_emails automatically — every existing code
--      path benefits without a refactor.

-- 1. Insert missing primary rows for auszubildende that have no
--    entry in auszubildende_emails yet.
INSERT INTO public.auszubildende_emails
  (auszubildende_id, email, is_primary, source)
SELECT a.id, lower(a.email), true, 'backfill'
FROM public.auszubildende a
WHERE a.email IS NOT NULL AND a.email <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.auszubildende_emails ae
    WHERE ae.auszubildende_id = a.id
  )
ON CONFLICT (email) DO NOTHING;

-- 2. Promote the legacy auszubildende.email to primary if a row exists
--    in the alias table but isn't currently primary AND no other row
--    is primary for that contact.
UPDATE public.auszubildende_emails ae
SET is_primary = true
FROM public.auszubildende a
WHERE ae.auszubildende_id = a.id
  AND ae.email = lower(a.email)
  AND ae.is_primary = false
  AND NOT EXISTS (
    SELECT 1 FROM public.auszubildende_emails ae2
    WHERE ae2.auszubildende_id = a.id AND ae2.is_primary
  );

-- 3. Trigger: mirror auszubildende.email into auszubildende_emails on
--    every INSERT or UPDATE OF email so the alias table never falls
--    behind. ON CONFLICT (email) DO NOTHING keeps us from stealing an
--    address that already belongs to a different contact (rare, but
--    surfacing the collision via the existing manual UI is the
--    correct UX rather than silent ownership transfer).
CREATE OR REPLACE FUNCTION public.sync_auszubildende_email_to_aliases()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.email IS NOT DISTINCT FROM NEW.email THEN
    RETURN NEW;
  END IF;

  UPDATE public.auszubildende_emails
     SET is_primary = false
   WHERE auszubildende_id = NEW.id AND is_primary = true;

  INSERT INTO public.auszubildende_emails
    (auszubildende_id, email, is_primary, source)
  VALUES (NEW.id, lower(NEW.email), true, 'sync')
  ON CONFLICT (email) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_auszubildende_email_to_aliases
  ON public.auszubildende;
CREATE TRIGGER trg_sync_auszubildende_email_to_aliases
  AFTER INSERT OR UPDATE OF email ON public.auszubildende
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auszubildende_email_to_aliases();
