create table email_campaigns (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete set null,
  subject text not null,
  body_text text not null,
  recipient_count int not null default 0,
  excluded_patient_ids uuid[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);
