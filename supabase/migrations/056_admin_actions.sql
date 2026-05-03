-- Audit trail for sensitive admin actions: password resets, manual
-- password sets, future cancel-booking + account-merge flows.
-- Append-only by convention (no UPDATE/DELETE policies).
--
-- We keep it minimal: just enough to answer "who did what to whom and
-- when" months after the fact. The `metadata` jsonb column carries
-- per-action specifics (e.g. did the recovery email send succeed,
-- which booking was cancelled, what was the LW response) so the table
-- shape doesn't have to change every time we add a new action type.

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The auth user who performed the action. Stored as the FK rather
  -- than denormalised email so renaming an admin doesn't rewrite the
  -- audit. profiles.first_name + profiles.last_name resolve at
  -- read time when needed.
  actor_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Free-form code: 'password_reset_email', 'password_manual_set',
  -- 'booking_cancel', 'account_merge', etc. We don't enum it so new
  -- action types don't require a migration.
  action_type  text NOT NULL,
  -- Logical target. For now everything points at auszubildende; if a
  -- future action targets staff_users or course_templates, the table
  -- name discriminates.
  target_table text NOT NULL,
  target_id    uuid NOT NULL,
  -- Per-action context, free-form. Examples:
  --   { "email": "foo@bar.de", "supabase_link_sent": true }
  --   { "lw_product_id": "...", "lw_response_status": 204 }
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_target
  ON public.admin_actions (target_table, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_actor
  ON public.admin_actions (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type
  ON public.admin_actions (action_type, created_at DESC);

COMMENT ON TABLE public.admin_actions IS
  'Append-only audit log for sensitive admin operations. Read via service-role; never expose to non-staff roles.';
