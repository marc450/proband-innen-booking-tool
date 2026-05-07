-- 063_auszubildende_drop_email_column.sql
-- Phase 2: drop the legacy auszubildende.email column. By the time this
-- runs, every read site queries the v_auszubildende view (joined onto
-- auszubildende_emails) and every write site routes the primary email
-- through auszubildende_emails directly via setAuszubildendePrimary or
-- setPrimaryEmailForAuszubildende. The 046 sync trigger is therefore
-- dead and is removed alongside the column.
--
-- IMPORTANT: run this AFTER the deploy that lands the read+write
-- refactor has fully completed, otherwise old running instances would
-- still try to insert/update email and crash.

DROP TRIGGER IF EXISTS trg_sync_auszubildende_email_to_aliases
  ON public.auszubildende;

DROP FUNCTION IF EXISTS public.sync_auszubildende_email_to_aliases();

-- The 061 view doesn't reference auszubildende.email (it pulls email
-- from auszubildende_emails via a LATERAL join), so the DROP COLUMN
-- below will not cascade through the view definition.
ALTER TABLE public.auszubildende DROP COLUMN email;
