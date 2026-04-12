-- Add a note field for blocked slots so admins can record why a slot was blocked.
ALTER TABLE slots ADD COLUMN blocked_note text;
