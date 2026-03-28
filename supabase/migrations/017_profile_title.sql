-- Add title field to profiles (e.g. Dr., Prof., Prof. Dr.)
ALTER TABLE profiles ADD COLUMN title TEXT DEFAULT NULL;
