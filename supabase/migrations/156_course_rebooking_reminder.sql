-- 156: Zahlungserinnerung für offene Umbuchungen.
--
-- A gated Umbuchung holds seats (154) but the Umbuchungsgebühr is often simply
-- forgotten: the doctor gets one email and nothing chases her, so the hold runs
-- out and everyone loses the move. The daily sweep now sends exactly one
-- reminder once the fee has been open for 48h.
--
-- Idempotency is the same model as the Galderma export's exported_at: stamp the
-- row when the mail goes out, and only ever select rows where the stamp is null.
-- A missed or double-run sweep can then never mail her twice.
alter table public.course_rebooking_requests
  add column if not exists reminder_sent_at timestamptz;

comment on column public.course_rebooking_requests.reminder_sent_at is
  'When the 48h Zahlungserinnerung went out. Null = not yet reminded. Set once, never reset; keeps the daily sweep from mailing twice.';
