# Waitlist Feature for Course Bookings

## Context

When a course session is fully booked, the admin team manually manages a waitlist outside the system. When a spot frees up (cancellation), there's no automated notification. This feature adds a self-service waitlist with automatic notifications when spots open.

## SQL Migration

```sql
CREATE TABLE course_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES course_sessions(id) ON DELETE CASCADE,
  template_id uuid REFERENCES course_templates(id),
  course_type text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  audience_tag text DEFAULT 'Humanmediziner:in',
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'converted', 'expired')),
  notified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_waitlist_session_status ON course_waitlist(session_id, status);

ALTER TABLE course_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage waitlist"
  ON course_waitlist FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

## Step 1: User-Facing Waitlist Signup

When a user selects a fully booked session, the CTA button changes from "[Kurstyp] buchen" to "Auf die Warteliste". Clicking opens a modal form (Vorname, Nachname, E-Mail, Telefon) that submits to a new API route.

**Files:**
- `src/app/courses/[courseKey]/course-card.tsx` — change button text + behavior for full sessions
- `src/app/courses/[courseKey]/waitlist-modal.tsx` — **new** modal (reuse TerminUpdateModal pattern with ReactDOM.createPortal)

## Step 2: Waitlist API Route

**New file:** `src/app/api/course-waitlist/route.ts`
- POST: validates session is full, inserts into `course_waitlist`
- Sends confirmation email: "Du stehst auf der Warteliste für {courseName} am {date}"
- Sends Slack notification
- Reuse `buildEmailHtml()` from `src/lib/email-template.ts`

## Step 3: Auto-Notify on Cancellation

**Modify:** `src/app/api/cancel-course-booking/route.ts`
- After seat is freed (decrement_booked_seats), query waitlist for that session_id where status = 'waiting', ORDER BY created_at ASC, LIMIT 1
- Send email to first person: "Ein Platz ist frei geworden für {courseName} am {date}! Buche jetzt: {link}"
- Update their status to 'notified' + set notified_at
- Link goes to the course page where they can book normally

## Step 4: Admin Dashboard

**New files:**
- `src/app/dashboard/auszubildende/warteliste/page.tsx` — server component
- `src/app/dashboard/auszubildende/warteliste/waitlist-manager.tsx` — client component

Table: Name, E-Mail, Kurs, Termin, Status (waiting/notified/converted/expired), Eingetragen am
Actions: manually change status, manually send notification, delete entry

**Modify:** `src/app/dashboard/nav.tsx` — add "Warteliste" under Auszubildende group

## Step 5: Auto-Convert on Booking

**Modify:** `src/app/api/stripe-webhook/route.ts`
- After successful booking, check if the booker's email exists in waitlist for that session
- If yes, update waitlist entry status to 'converted'

## Files Summary

| File | Change |
|---|---|
| `src/app/courses/[courseKey]/course-card.tsx` | Waitlist button for full sessions |
| `src/app/courses/[courseKey]/waitlist-modal.tsx` | **New** modal form |
| `src/app/api/course-waitlist/route.ts` | **New** POST endpoint |
| `src/app/api/cancel-course-booking/route.ts` | Notify first waitlisted person |
| `src/app/api/stripe-webhook/route.ts` | Auto-convert waitlist on booking |
| `src/app/dashboard/auszubildende/warteliste/page.tsx` | **New** admin page |
| `src/app/dashboard/auszubildende/warteliste/waitlist-manager.tsx` | **New** admin component |
| `src/app/dashboard/nav.tsx` | Add Warteliste nav item |
| `src/lib/email-template.ts` | Reuse existing `buildEmailHtml()` |

## Verification

1. Fill all seats in a test session → verify "Auf die Warteliste" button appears
2. Submit waitlist form → verify DB entry + confirmation email
3. Cancel a booking → verify first waitlisted person gets notification email with booking link
4. That person books → verify waitlist entry auto-converts to 'converted'
5. Admin dashboard: verify waitlist table, status management, manual notification
