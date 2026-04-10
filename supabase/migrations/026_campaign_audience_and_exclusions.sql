-- Allow composite contact IDs (p-<uuid>, a-<uuid>) in the exclusion list.
-- Previously this column only accepted uuid[], which broke when the campaign
-- composer started sending prefixed IDs for the unified Proband:innen + Azubi
-- recipient list.
alter table email_campaigns
  alter column excluded_patient_ids type text[] using excluded_patient_ids::text[];

-- Persist audience selection on drafts so it survives reopening.
alter table email_campaigns
  add column if not exists audience_type text
    check (audience_type in ('probandinnen', 'aerztinnen', 'alle'));
