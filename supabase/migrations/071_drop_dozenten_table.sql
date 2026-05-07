-- 071_drop_dozenten_table.sql
-- Drop the orphaned dozenten table. The actual instructor source for
-- the dashboard is profiles where is_dozent=true (verified pre-drop:
-- all 4 dozenten rows are duplicated in profiles). Nothing else
-- references this table; the only readers were its own dead-end UI
-- and a TemplatesManager component that was never imported anywhere.

DROP TABLE IF EXISTS public.dozenten;
