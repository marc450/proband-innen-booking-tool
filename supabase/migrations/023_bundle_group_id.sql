-- Add bundle_group_id to course_bookings for curriculum bundle purchases
-- All bookings from a single bundle checkout share the same bundle_group_id
ALTER TABLE course_bookings ADD COLUMN bundle_group_id uuid;

CREATE INDEX idx_course_bookings_bundle_group ON course_bookings (bundle_group_id) WHERE bundle_group_id IS NOT NULL;
