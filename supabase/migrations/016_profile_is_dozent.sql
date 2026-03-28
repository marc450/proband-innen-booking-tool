-- Add is_dozent flag to profiles so users can be admin AND Dozent:in simultaneously
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_dozent BOOLEAN NOT NULL DEFAULT false;

-- Existing dozent-role users are automatically dozentinnen
UPDATE profiles SET is_dozent = true WHERE role = 'dozent';
