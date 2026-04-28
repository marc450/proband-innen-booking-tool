-- Campaign include list. When non-empty, the campaign is sent only
-- to contacts in this list (intersected with the chosen audience and
-- the blacklist filter), not to "all of audience minus excluded".
-- The existing excluded_patient_ids column stays in place — it still
-- works as a per-contact deselect on top of whichever set is in play.
alter table email_campaigns
  add column if not exists included_patient_ids text[];
