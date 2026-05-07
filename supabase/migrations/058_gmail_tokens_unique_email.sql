-- 058_gmail_tokens_unique_email.sql
-- Add UNIQUE on gmail_tokens.email so saveTokens() can use a proper upsert
-- instead of the racy delete-then-insert pattern in src/lib/gmail.ts.

-- Step 1: dedupe any duplicate rows per email, keep the most recently updated one.
DELETE FROM public.gmail_tokens a
USING public.gmail_tokens b
WHERE a.email = b.email
  AND a.ctid <> b.ctid
  AND COALESCE(a.updated_at, 'epoch'::timestamptz)
      < COALESCE(b.updated_at, 'epoch'::timestamptz);

-- Step 2: enforce one row per mailbox at the DB level.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gmail_tokens_email_key'
  ) THEN
    ALTER TABLE public.gmail_tokens
      ADD CONSTRAINT gmail_tokens_email_key UNIQUE (email);
  END IF;
END $$;
