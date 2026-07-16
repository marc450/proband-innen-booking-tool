# Runbook: unsalted email/phone hashes → keyed HMAC

Status: **planned, not started.** This is the sequence for closing the last
E2EE gap: `email_hash` / `phone_hash` are currently unsalted `SHA-256`, which
is reversible for phone numbers and confirmable for emails **if the database
leaks**. The encrypted PII blobs themselves are not affected; only these
derived hash columns are the weak point.

E2EE-adjacent change: notify Marc before and after each step. Every step is
individually low-risk if executed in this order. The danger is only in
flipping the hash function without the dual-read + backfill.

---

## The core change

In `src/lib/encryption.ts`:

```
hashEmail(x) = HMAC-SHA256(HASH_PEPPER, x.toLowerCase().trim())
hashPhone(x) = HMAC-SHA256(HASH_PEPPER, digitsOnly(x))
```

`HASH_PEPPER` is a new server-only secret (32 random bytes), stored like
`ENCRYPTION_PRIVATE_KEY`. The hash stays **deterministic**, so dedup and
blacklist lookups behave identically; without the pepper the hashes can no
longer be precomputed or brute-forced.

## What holds the hashes (all three carry the encrypted source → recomputable)

| Store | Hash columns | Encrypted source for re-hash |
|---|---|---|
| `patients` | `email_hash`, `phone_hash` | `encrypted_data` / `encrypted_key` / `encryption_iv` |
| `bookings` | `email_hash`, `phone_hash` | `encrypted_data` / `encrypted_key` / `encryption_iv` |
| `patient_email_hashes` | `email_hash` | `encrypted_email` / `encrypted_key` / `encryption_iv` |

## Fiddly bits (do not miss)

- **Two hash implementations.** `src/lib/encryption.ts` **and** a private copy
  inside `src/app/api/confirm-booking/route.ts` (lines ~56-60). Both must change.
- **~15 call sites.** Lookups (match on both hashes during transition):
  `check-booking-eligibility`, `create-private-booking`, `admin/create-contact`,
  `inbox/contact`, `inbox/emails`, `inbox/ai-draft`, `inbox/merge`,
  `lib/contact-emails.ts`, `lib/patient-name.ts`, `lib/inbox-contact-names.ts`.
  Writes (store HMAC): `confirm-booking`, `create-private-booking`,
  `update-patient-fields`, `admin/create-contact`, `inbox/emails`,
  `inbox/merge`, `nachbehandlung`, `migrate-patient-emails`.
- **`HASH_PEPPER` is permanent.** Once data is hashed with it, changing or
  losing it means re-running the backfill. Guard it like the private key.

## Guardrails

- The backfill script may **only** `UPDATE` the hash columns. It must never
  write the encrypted columns. The encrypted blobs are the irreplaceable data
  and stay untouched, so a botched backfill loses nothing permanent (re-run it).

---

## Step 0 — Safety net (do this first)

**0a. Confirm the backup fallback (no action needed beyond a glance).** We are on
Supabase **Pro**, which takes **automatic daily backups with 7-day retention** —
a recent backup always exists without doing anything. Before running the
backfill, just note the latest backup timestamp under
*Settings → Database → Backups* so the fallback point is known.

Two caveats, neither of which blocks this migration:

- Pro's daily backups are **daily snapshots, not point-in-time**. Restoring one
  rolls the whole DB back to that snapshot, losing anything since (bookings,
  emails, …). Restoring to the exact moment before the migration needs
  **Point-in-Time Recovery (PITR)**, a separate paid add-on not enabled by
  default on Pro. For this job PITR is optional overkill: step 0b below is the
  precise revert, and a full DB restore should never be necessary because the
  backfill only rewrites recomputable columns.
- **Do NOT export decrypted patient data to any local file** as a "backup" —
  that would create an unencrypted copy of the exact PII the E2EE protects, a
  bigger and longer-lived exposure than the bug being fixed. Backups stay
  encrypted-at-rest inside Supabase.

Safety-net hierarchy for this migration, in the order you'd actually reach for
them: **0b side table** (targeted, instant, loses nothing) → automatic daily
backup (broad fallback) → PITR (only if enabled; not required).

**0b. Stash the current hashes in a side table** (contains no PII, only the old
hashes; RLS-locked; dropped at the end). Lets us revert the hash columns
instantly without touching anything else:

```sql
create table if not exists public.hash_backfill_backup (
  source_table text not null,          -- 'patients' | 'bookings' | 'patient_email_hashes'
  row_id       uuid not null,
  email_hash   text,
  phone_hash   text,
  backed_up_at timestamptz not null default now(),
  primary key (source_table, row_id)
);
alter table public.hash_backfill_backup enable row level security;
-- No policies: service_role only (bypasses RLS). Not exposed via the Data API.

insert into public.hash_backfill_backup (source_table, row_id, email_hash, phone_hash)
select 'patients', id, email_hash, phone_hash from public.patients
on conflict (source_table, row_id) do nothing;

insert into public.hash_backfill_backup (source_table, row_id, email_hash, phone_hash)
select 'bookings', id, email_hash, phone_hash from public.bookings
on conflict (source_table, row_id) do nothing;

insert into public.hash_backfill_backup (source_table, row_id, email_hash, phone_hash)
select 'patient_email_hashes', id, email_hash, null from public.patient_email_hashes
on conflict (source_table, row_id) do nothing;
```

(Verify the PK column names/types before running; adjust if any store keys
differently.)

---

## Step 1 — Add the pepper

Generate and set `HASH_PEPPER` (32 random bytes, e.g. `openssl rand -base64 32`)
as a server-only env var on Railway and locally. It must be present **before**
Step 2 deploys. Never change it afterwards.

## Step 2 — Dual-read deploy (code)

- `hashEmail` / `hashPhone` → HMAC. Add `legacyHashEmail` / `legacyHashPhone`
  (the old `SHA-256`) for the transition. Mirror the change in the
  `confirm-booking` private copy.
- Every **lookup** site matches on both forms, e.g.
  `.in('email_hash', [hashEmail(x), legacyHashEmail(x)])`, so a row is found
  whether or not it has been backfilled yet (dedup + blacklist stay correct).
- Every **write** site stores the new HMAC (mostly automatic via `hashEmail`).
- Deploy. Nothing breaks pre-backfill because reads accept both forms.

## Step 3 — Backfill (Marc-triggered)

A resumable, batched admin script/route (same shape as
`migrate-patient-emails`) that, for `patients`, `bookings`, and
`patient_email_hashes`:

1. Decrypts the row's encrypted source to recover email/phone.
2. Recomputes `HMAC(HASH_PEPPER, value)`.
3. `UPDATE`s only the hash column(s).

Idempotent: re-running it is safe. Rows whose decryption falls back to legacy
plaintext are hashed from that plaintext.

## Step 4 — Verify

- A known returning email and a known blacklisted email both still resolve.
- No row still carries a legacy-format hash (spot check / count).
- Dedup on a fresh booking with an existing email is still caught.

## Step 5 — Cleanup deploy

- Remove the `legacyHash*` dual-read so lookups use HMAC only.
- `drop table public.hash_backfill_backup;` once everything is verified.

---

## Rollback

- **During Step 2 (before backfill):** revert the deploy. Rows still hold
  `SHA-256`; removing the dual-read code returns to prior behavior. No data
  change occurred.
- **During/after Step 3:** restore the hash columns from
  `hash_backfill_backup` (a per-store `UPDATE ... FROM`). This is the intended
  path: targeted, instant, and it loses no other data. Falling back to the
  automatic daily backup (0a) would roll the whole DB back to that snapshot and
  lose everything since, so it is a last resort, not the plan. The encrypted PII
  is never modified by the backfill either way, so nothing permanent is at risk.
