-- ============================================================
-- Migration 018: Auszubildende Course Bookings
-- Expands course_templates, creates course_sessions & course_bookings
-- ============================================================

-- 1a. Expand course_templates with Auszubildende-specific columns
-- All new columns are nullable so existing Proband:innen templates are unaffected.

ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS course_key text UNIQUE;
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS course_label_de text;

-- Per-type display names
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS name_online text;
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS name_praxis text;
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS name_kombi text;

-- Per-type pricing (gross EUR)
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS price_gross_online numeric;
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS price_gross_praxis numeric;
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS price_gross_kombi numeric;

-- Per-type VAT rates (e.g. 0.19)
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS vat_rate_online numeric;
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS vat_rate_praxis numeric;
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS vat_rate_kombi numeric;

-- Per-type descriptions
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS description_online text;
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS description_praxis text;
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS description_kombi text;

-- Per-type Stripe redirect URLs
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS success_url_online text;
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS success_url_praxis text;
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS success_url_kombi text;
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS cancel_url_online text;
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS cancel_url_praxis text;
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS cancel_url_kombi text;

-- Template status (draft/live)
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

-- LearnWorlds online course ID (for future enrollment integration)
ALTER TABLE course_templates ADD COLUMN IF NOT EXISTS online_course_id text;

-- 1b. Create course_sessions (replaces Zapier's ephia_course_sessions)
CREATE TABLE IF NOT EXISTS course_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES course_templates(id) ON DELETE CASCADE,
  date_iso date NOT NULL,
  label_de text,
  instructor_name text,
  max_seats integer NOT NULL DEFAULT 5,
  booked_seats integer NOT NULL DEFAULT 0,
  address text,
  start_time text,
  duration_minutes integer,
  is_live boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_sessions_template ON course_sessions(template_id);
CREATE INDEX IF NOT EXISTS idx_course_sessions_live ON course_sessions(is_live) WHERE is_live = true;

-- 1c. Create course_bookings (NO encryption - plaintext PII for doctors)
CREATE TABLE IF NOT EXISTS course_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES course_sessions(id),
  template_id uuid NOT NULL REFERENCES course_templates(id),
  course_type text NOT NULL CHECK (course_type IN ('Onlinekurs', 'Praxiskurs', 'Kombikurs')),
  first_name text,
  last_name text,
  email text,
  phone text,
  stripe_checkout_session_id text,
  stripe_customer_id text,
  amount_paid integer,
  status text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'completed', 'cancelled', 'refunded')),
  audience_tag text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_bookings_session ON course_bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_course_bookings_template ON course_bookings(template_id);
CREATE INDEX IF NOT EXISTS idx_course_bookings_stripe ON course_bookings(stripe_checkout_session_id);

-- 1d. RPC for atomic seat management + booking creation
CREATE OR REPLACE FUNCTION create_course_booking(
  p_session_id uuid,
  p_template_id uuid,
  p_course_type text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_stripe_checkout_session_id text,
  p_stripe_customer_id text,
  p_amount_paid integer
) RETURNS uuid AS $$
DECLARE
  v_max integer;
  v_booked integer;
  v_booking_id uuid;
BEGIN
  -- For Praxiskurs/Kombikurs: lock session row and check capacity
  IF p_session_id IS NOT NULL THEN
    SELECT max_seats, booked_seats INTO v_max, v_booked
    FROM course_sessions WHERE id = p_session_id FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'SESSION_NOT_FOUND';
    END IF;

    IF v_booked >= v_max THEN
      RAISE EXCEPTION 'SESSION_FULL';
    END IF;

    -- Increment booked seats
    UPDATE course_sessions SET booked_seats = booked_seats + 1 WHERE id = p_session_id;
  END IF;

  -- Insert booking
  INSERT INTO course_bookings (
    session_id, template_id, course_type,
    first_name, last_name, email, phone,
    stripe_checkout_session_id, stripe_customer_id, amount_paid
  ) VALUES (
    p_session_id, p_template_id, p_course_type,
    p_first_name, p_last_name, p_email, p_phone,
    p_stripe_checkout_session_id, p_stripe_customer_id, p_amount_paid
  ) RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

-- 1e. RLS policies

-- course_sessions: anon can read live sessions, authenticated can CRUD
ALTER TABLE course_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view live course sessions"
  ON course_sessions FOR SELECT
  TO anon
  USING (is_live = true);

CREATE POLICY "Authenticated can view all course sessions"
  ON course_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert course sessions"
  ON course_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update course sessions"
  ON course_sessions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can delete course sessions"
  ON course_sessions FOR DELETE
  TO authenticated
  USING (true);

-- course_bookings: only authenticated staff can access
ALTER TABLE course_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view course bookings"
  ON course_bookings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert course bookings"
  ON course_bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update course bookings"
  ON course_bookings FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert course bookings"
  ON course_bookings FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can select course bookings"
  ON course_bookings FOR SELECT
  TO service_role
  USING (true);
