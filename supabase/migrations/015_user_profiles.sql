-- User profiles table for role management
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'dozent' CHECK (role IN ('admin', 'dozent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all profiles (needed to check own role in layout)
CREATE POLICY "authenticated_read_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Service role has full access (used by API routes)
CREATE POLICY "service_role_all_profiles"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
