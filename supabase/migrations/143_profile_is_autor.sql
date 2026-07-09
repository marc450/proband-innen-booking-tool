-- 143_profile_is_autor.sql
-- Adds an is_autor capability flag to profiles. An "Autor:in" is a normal
-- staff user (role 'nutzer') who additionally gets access to the
-- Lernzentrum (LMS) to author courses and CME-Fallstudien. Orthogonal to
-- role, exactly like is_dozent / is_kursbetreuung: an admin or a nutzer
-- can also be an Autor:in.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_autor BOOLEAN NOT NULL DEFAULT false;
