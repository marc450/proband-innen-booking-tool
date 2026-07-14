-- Set-password token for the Auszubildende onboarding flow.
--
-- Replaces the insecure inline set-password step (anyone who knew a
-- doctor's email could claim their account). The doctor now proves
-- ownership of their inbox by clicking a per-recipient token link that
-- we email them. The token is minted at course-confirmation time and
-- carried as the "Jetzt Passwort festlegen" button in the confirmation
-- email; it can also be re-issued on demand from ephia.de/start.
--
-- Anchored on auszubildende, mirroring the existing review_submit_token
-- pattern (migration 122): a random, single-use, expiring token with a
-- partial-unique index.
--
-- auszubildende is only ever read/written server-side through the
-- service-role admin client (which bypasses RLS), so no additional
-- grants are required for these columns.

alter table public.auszubildende
  add column if not exists password_setup_token text,
  add column if not exists password_setup_token_expires_at timestamptz;

create unique index if not exists auszubildende_password_setup_token_key
  on public.auszubildende (password_setup_token)
  where password_setup_token is not null;

comment on column public.auszubildende.password_setup_token is
  'Single-use, expiring token for the customer set-password link (ephia.de/passwort-einrichten?token=...). Cleared once the password is set.';
comment on column public.auszubildende.password_setup_token_expires_at is
  'Expiry timestamp for password_setup_token. Links older than this are rejected and the user must request a fresh one on /start.';
