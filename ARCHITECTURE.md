# EPHIA Proband:innen Booking Tool — Architecture

Medical aesthetics booking platform for EPHIA. Patients book slots in training courses; Ärzt:innen are the "probands" (patients treated during training). Two booking funnels: public (Stripe payment capture) and private (doctor-referred, no payment).

Deployed on **Railway** (auto-deploys from pushes to `main` on GitHub at `marc450/proband-innen-booking-tool`).

---

## Tech Stack

- **Framework**: Next.js (App Router, see `node_modules/next/dist/docs/` for version-specific API)
- **Database + Auth**: Supabase (PostgreSQL, RLS policies, Edge Functions on Deno)
- **Payments**: Stripe (setup intent mode — captures payment method, no immediate charge)
- **Email**: Resend (`customerlove@ephia.de`)
- **Notifications**: Slack incoming webhook
- **Styling**: Tailwind v4 + shadcn/ui components
- **Font**: Roboto via `next/font/google`

---

## Directory Map

```
src/
  app/
    page.tsx                        # Root landing/redirect
    layout.tsx                      # Root layout (Roboto font, globals)
    middleware.ts                   # Protects /dashboard routes (Supabase auth)

    book/                           # PUBLIC: Standard booking funnel
      page.tsx                      # Courses overview
      courses-overview.tsx
      booking-page.tsx
      booking-form.tsx              # Stripe Elements + patient details form
      [courseId]/
        page.tsx
        slot-selection.tsx          # Shows slots with Dozent:in + Ort
      success/
        page.tsx
        success-content.tsx         # Calls /api/confirm-booking after Stripe redirect

    book/privat/                    # PUBLIC: Private booking funnel (no Stripe)
      page.tsx
      courses-overview.tsx
      booking-form.tsx              # firstName, lastName, email, phone, referringDoctor
      [courseId]/
        page.tsx
        slot-selection.tsx
      success/page.tsx

    courses/[courseKey]/             # PUBLIC: Auszubildende course landing page (iframe embed)
      page.tsx                      # Server: fetches template + live sessions
      course-cards-page.tsx         # Client: 3 cards (Onlinekurs/Praxiskurs/Kombikurs)
      course-card.tsx               # Card component with date picker + checkout

    dashboard/                      # PROTECTED: Staff admin interface (dropdown nav)
      layout.tsx
      nav.tsx                       # Grouped nav: Proband:innen ▾ / Auszubildende ▾ / Einstellungen
      page.tsx                      # Main dashboard (Proband:innen courses, slots, bookings)
      courses-manager.tsx           # CRUD courses + slots + templates
      templates-manager.tsx
      bookings/
        bookings-manager.tsx        # List bookings, update status, charge no-shows
      patients/
        patients-manager.tsx        # List patients, edit notes, delete, import CSV
        [id]/patient-detail.tsx
      dozenten/
        dozenten-manager.tsx        # CRUD instructors (Dozent:innen)
      campaigns/
        campaigns-manager.tsx       # Email campaigns: draft/schedule/send
        new/campaign-composer.tsx
      auszubildende/                  # Auszubildende (doctor course bookings)
        page.tsx                    # Course sessions overview
        course-sessions-manager.tsx # CRUD sessions, toggle is_live
        buchungen/
          page.tsx                  # Course bookings list
          course-bookings-manager.tsx # Bookings table with search/status
      settings/
        settings-content.tsx        # 4 tabs: Kursvorlagen, Benutzer, Kursangebot, Kurstermine
        users-manager.tsx           # Staff user management (roles: admin/dozent)
        course-offering-manager.tsx # CRUD for Auszubildende course templates
        course-sessions-settings.tsx # Session management (reuses course-sessions-manager)

    api/                            # Backend API routes (Next.js route handlers)
      create-checkout-session/      # POST: Stripe setup intent → checkout URL
      confirm-booking/              # POST: Confirms booking post-Stripe (E2EE, email, Slack)
      create-private-booking/       # POST: Direct booking for private patients (E2EE, email, Slack)
      check-booking-eligibility/    # POST: Blacklist + duplicate check
      charge-no-show/               # POST: Stripe invoice €50 for no-shows
      send-campaign/                # POST: Sends email campaign via Resend
      send-slot-change-email/       # POST: Notifies patient of slot change
      update-patient-notes/         # POST: Decrypt → merge notes → re-encrypt
      delete-patient/               # POST: Hard-deletes patient + bookings
      import-patients/              # POST: Bulk import patients from JSON (CSV/Excel)
      migrate-encryption/           # POST: One-off E2EE migration helper
      course-checkout/              # POST: Stripe payment checkout for course bookings
      course-sessions/              # GET: Live sessions for a template (polling endpoint)
      stripe-webhook/               # POST: Stripe webhook (checkout.session.completed → booking + emails + Slack)
      admin/users/route.ts          # GET list staff, POST create staff
      admin/users/[id]/route.ts     # PATCH update, DELETE remove staff

  lib/
    types.ts                        # Shared TS interfaces (Course, Slot, Booking, Patient, ...)
    encryption.ts                   # E2EE: RSA-OAEP + AES-256-GCM hybrid, hashEmail/hashPhone
    stripe.ts                       # Client-side stripePromise (publishable key)
    email-template.ts               # buildEmailHtml() — branded HTML email builder
    utils.ts                        # cn() — Tailwind className merge
    supabase/
      client.ts                     # Browser-side Supabase client
      server.ts                     # SSR Supabase client (uses cookies)
      admin.ts                      # createAdminClient() — service-role, bypasses RLS
      middleware.ts                  # updateSession() for auth middleware

  components/
    ui/                             # shadcn/ui: button, card, dialog, input, select, table, etc.
    confirm-dialog.tsx              # Reusable confirmation dialog

supabase/
  migrations/                       # 17 SQL migrations (run in order)
  functions/
    create-checkout-session/        # Deno: Stripe checkout session
    confirm-booking/                # Deno: Mirror of /api/confirm-booking (legacy/alternate)
    charge-no-show/                 # Deno: Stripe no-show invoice (staff-only, with JWT)
    create-setup-intent/            # Deno: Stripe setup intent helper
```

---

## Database Schema

| Table / View | Purpose | Key Columns |
|---|---|---|
| `courses` | Course instances | `id`, `title`, `treatment_title`, `course_date`, `location`, `instructor`, `guide_price`, `image_url`, `template_id` |
| `slots` | Time slots per course | `id`, `course_id`, `start_time`, `end_time`, `capacity` |
| `bookings` | Encrypted bookings | `id`, `slot_id`, `patient_id`, `status` (booked/attended/no_show/cancelled), `booking_type` (standard/private), `referring_doctor`, `email_hash`, `encrypted_data/key/iv`, `stripe_customer_id`, `stripe_payment_method_id`, `stripe_checkout_session_id`, `charge_id` |
| `patients` | Encrypted patient PII | `id`, `email_hash`, `phone_hash`, `encrypted_data/key/iv`, `patient_status` (active/warning/blacklist), `notes` |
| `course_templates` | Reusable course definitions | `id`, `title`, `description`, `service_description`, `guide_price`, `image_url` |
| `email_campaigns` | Campaign metadata | `id`, `course_id`, `subject`, `body_text`, `status` (draft/scheduled/sending/sent/failed), `scheduled_at`, `excluded_patient_ids` |
| `dozenten` | Instructor profiles | `id`, `title`, `first_name`, `last_name` |
| `profiles` | Staff user profiles | `id` (FK auth.users), `first_name`, `last_name`, `role` (admin/dozent), `is_dozent`, `title` |
| `available_slots` | VIEW: slots + remaining capacity | All slot columns + `course_title`, `remaining_capacity` |
| `course_sessions` | Auszubildende course dates | `id`, `template_id`, `date_iso`, `label_de`, `instructor_name`, `max_seats`, `booked_seats`, `address`, `start_time`, `duration_minutes`, `is_live` |
| `course_bookings` | Auszubildende bookings (NO E2EE) | `id`, `session_id`, `template_id`, `course_type`, `first_name`, `last_name`, `email`, `phone`, `stripe_checkout_session_id`, `amount_paid`, `status`, `audience_tag` |

**Atomic booking creation**: RPC `create_encrypted_booking()` — locks slot row (FOR UPDATE), checks capacity, raises `SLOT_FULL` / `DUPLICATE_BOOKING` exceptions.

**Atomic course booking**: RPC `create_course_booking()` — locks session row (FOR UPDATE), checks capacity, increments `booked_seats`, inserts into `course_bookings`. Raises `SESSION_FULL` / `SESSION_NOT_FOUND`.

---

## End-to-End Encryption (E2EE)

All patient PII is encrypted at rest. **Do not change encryption logic without careful review.**

- **Scheme**: RSA-OAEP 2048-bit (key wrap) + AES-256-GCM (data encryption)
- **What is encrypted**: name, email, phone, address, Stripe IDs, notes
- **What is stored plaintext**: `email_hash` (SHA-256), `phone_hash` (SHA-256) — for deduplication and blacklist checks only
- **Keys**: `ENCRYPTION_PUBLIC_KEY` encrypts (used in API routes + Edge Functions). `ENCRYPTION_PRIVATE_KEY` decrypts (server-side only, never exposed to browser).
- **Migration fallback**: `decryptFields()` falls back gracefully to unencrypted data for legacy records.
- **Helpers**: `lib/encryption.ts` — `encryptPatientFields()`, `encryptBookingFields()`, `decryptPatient()`, `decryptBooking()`, `hashEmail()`, `hashPhone()`

---

## Booking Flows

### Standard Funnel (`/book`)
1. Patient picks course → selects slot → fills form (name, email, phone, address)
2. `POST /api/create-checkout-session` → Stripe setup intent → redirect to Stripe checkout
3. Stripe redirects to `/book/success?session_id=...`
4. `success-content.tsx` calls `POST /api/confirm-booking`
5. `confirm-booking` validates session, checks blacklist/duplicates, encrypts data, calls RPC, sends confirmation email + Slack notification

### Private Funnel (`/book/privat`)
1. Staff or doctor fills form (patient name, email, phone, referringDoctor)
2. `POST /api/create-private-booking` → eligibility check → encrypt → RPC → email + Slack
3. No Stripe involved

### Auszubildende Course Booking (`/courses/[courseKey]`, embedded in LearnWorlds iframe)
1. Doctor visits landing page (3 cards: Onlinekurs/Praxiskurs/Kombikurs)
2. For Praxiskurs/Kombikurs: selects a date from dropdown (shows availability)
3. Clicks "buchen" → `POST /api/course-checkout` → Stripe payment checkout (real charge)
4. Stripe redirects to ephia.de thank-you page
5. Stripe webhook `POST /api/stripe-webhook` fires on `checkout.session.completed`
6. Webhook: RPC `create_course_booking()` (atomic seat management), sends confirmation email + WhatsApp community invite + Slack notification
7. No E2EE — doctor PII stored in plaintext in `course_bookings`

### No-Show Penalty
- Admin sets booking status to `no_show` in dashboard
- `POST /api/charge-no-show` creates Stripe invoice (€50 EUR) against stored payment method

---

## External Services

| Service | Purpose | Config |
|---|---|---|
| Stripe | Payment method capture (setup intent). No-show charges (invoice). | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Resend | Transactional emails (booking confirmation, slot changes, campaigns) | `RESEND_API_KEY`, from: `customerlove@ephia.de` |
| Slack | New booking notifications (type, course, date, remaining slots) | `SLACK_WEBHOOK_URL` (incoming webhook) |
| Supabase | Database, Auth, Edge Functions, RLS | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY         # Server-side only

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY                 # Server-side only

# Email
RESEND_API_KEY

# E2EE
ENCRYPTION_PUBLIC_KEY             # PEM format, \\n escaped
ENCRYPTION_PRIVATE_KEY            # PEM format, \\n escaped, server-side only

# Notifications
SLACK_WEBHOOK_URL                 # Optional; skipped if not set

# Stripe Webhook
STRIPE_WEBHOOK_SECRET             # For verifying Stripe webhook signatures
```

---

## Auth & Roles

- Auth via Supabase email/password (staff only — patients do not have accounts)
- `src/middleware.ts` protects all `/dashboard/**` routes
- `profiles.role`: `admin` or `dozent`
- `profiles.is_dozent`: boolean (a user can be both admin AND dozent)
- Instructors in the `dozenten` table are separate from auth users (no login)

---

## Design System

- Background: `#FAEBE1`
- Primary CTA: `#0066FF`, bold, 1.6rem, padding 15px 25px, radius 10px
- Border radius: 10px (buttons + cards)
- No borders on cards (border-free design)
- CSS variables in `globals.css`: `--primary`, `--radius`
- Full reference: `~/.claude/EPHIA_DESIGN_SYSTEM.md`

---

## Edge Functions

Deploy with: `supabase functions deploy <name>`
- Public functions (no auth needed): `--no-verify-jwt`
- Staff-only functions (e.g. `charge-no-show`): omit `--no-verify-jwt`

The `/api/confirm-booking` Next.js route and `supabase/functions/confirm-booking` Edge Function are parallel implementations. The Next.js route is the active one used by the frontend.
