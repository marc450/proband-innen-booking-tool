-- Email drafts table (compose + reply drafts)
CREATE TABLE IF NOT EXISTS email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('compose', 'reply')),
  thread_id TEXT,
  "to" TEXT,
  subject TEXT,
  body TEXT NOT NULL DEFAULT '',
  cc TEXT,
  bcc TEXT,
  show_cc BOOLEAN NOT NULL DEFAULT false,
  show_bcc BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One compose draft per user
CREATE UNIQUE INDEX uq_email_drafts_compose
  ON email_drafts (user_id) WHERE kind = 'compose';

-- One reply draft per user per thread
CREATE UNIQUE INDEX uq_email_drafts_reply
  ON email_drafts (user_id, thread_id) WHERE kind = 'reply';

CREATE INDEX idx_email_drafts_user ON email_drafts (user_id);

ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_drafts_select"
  ON email_drafts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_own_drafts_insert"
  ON email_drafts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_own_drafts_update"
  ON email_drafts FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_own_drafts_delete"
  ON email_drafts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "service_role_all_email_drafts"
  ON email_drafts FOR ALL TO service_role
  USING (true) WITH CHECK (true);
