-- 159: Close a stale rebooking request (one-off data fix, already applied in
-- Supabase on 2026-07-19; recorded here to keep the repo in sync).
--
-- Request 08562779 (Tobias Kliesener, Grundkurs Dermalfiller 31. Mai -> 29. Nov,
-- 129 EUR Umbuchungsgebühr) predates the seat-hold model. The fee was collected
-- out-of-band via a manually sent Stripe invoice (EPHIA26-0284, paid) and the
-- booking was moved to 29. Nov by hand, so neither payment nor move ever ran
-- through the tool's checkout -> webhook path. The request therefore stayed
-- 'pending' with a still-live /umbuchung/bezahlen link that mints a fresh Stripe
-- checkout on every visit: reopening the original email would let him pay the
-- 129 EUR a SECOND time.
--
-- Marking it 'applied' matches reality (the move happened) and kills the link
-- (the payment page only serves a request while it is 'pending').
--
-- NO seat math and NOT via apply_course_rebooking on purpose: the seats were
-- already adjusted by hand (booking sits on the target, 31. Mai freed), so
-- running the RPC would double-adjust. This is a pure status correction.
--
-- Guarded on status='pending' so it is a no-op if already applied or on a fresh
-- database where the row does not exist.
update public.course_rebooking_requests
   set status = 'applied', applied_at = coalesce(applied_at, now())
 where id = '08562779-5320-459e-a0a7-0223ae2c2c39'
   and status = 'pending';
