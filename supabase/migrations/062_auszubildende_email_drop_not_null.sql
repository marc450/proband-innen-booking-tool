-- 062_auszubildende_email_drop_not_null.sql
-- Phase 1 of dropping auszubildende.email. Make the column nullable so
-- new code paths (which create contacts without writing the legacy
-- column) can insert without violating NOT NULL during the deploy
-- window. Phase 2 (063) drops the column, trigger, and function once
-- the deploy is verified.

ALTER TABLE public.auszubildende ALTER COLUMN email DROP NOT NULL;
