-- Course templates: reusable course definitions
CREATE TABLE IF NOT EXISTS course_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  service_description text,
  guide_price text,
  image_url text,
  instructor text,
  created_at timestamptz DEFAULT now()
);

-- Link courses to templates
ALTER TABLE courses ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES course_templates(id);

-- Backfill: create one template per unique course title from existing data
INSERT INTO course_templates (title, description, service_description, guide_price, image_url, instructor)
SELECT DISTINCT ON (title)
  title,
  description,
  service_description,
  guide_price,
  image_url,
  instructor
FROM courses
ORDER BY title, created_at ASC
ON CONFLICT DO NOTHING;

-- Backfill template_id on existing courses
UPDATE courses c
SET template_id = ct.id
FROM course_templates ct
WHERE c.title = ct.title AND c.template_id IS NULL;
