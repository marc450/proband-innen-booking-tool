# EPHIA Booking System - Setup

## Prerequisites

- Node.js 18+
- Supabase account (https://supabase.com)
- Stripe account (https://stripe.com)
- Supabase CLI (`npm install -g supabase`)

## 1. Supabase Setup

### Create a project
1. Go to https://supabase.com/dashboard and create a new project
2. Note your **Project URL** and **Anon Key** from Settings > API

### Run the database migration
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or manually: copy `supabase/migrations/001_initial_schema.sql` and run it in the Supabase SQL Editor.

### Create a staff user
In the Supabase Dashboard > Authentication > Users, create a user with email/password. This user will be able to access the `/dashboard`.

### Deploy Edge Functions
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
supabase functions deploy create-setup-intent
supabase functions deploy confirm-booking
supabase functions deploy charge-no-show
```

## 2. Stripe Setup

1. Get your **Publishable Key** and **Secret Key** from https://dashboard.stripe.com/apikeys
2. For testing, use the `pk_test_` and `sk_test_` keys

## 3. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (pk_test_...) |
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_test_...) |

## 4. Run locally

```bash
npm install
npm run dev
```

- Public booking: http://localhost:3000/book
- Staff login: http://localhost:3000/login
- Staff dashboard: http://localhost:3000/dashboard

## 5. Testing

### Test card numbers (Stripe)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

Use any future expiry date and any 3-digit CVC.

### Booking flow
1. Create a course + slot in the dashboard
2. Visit /book and book a slot as a patient
3. In the dashboard, mark the booking as "no_show"
4. Click the charge button to charge the no-show fee

## Architecture

```
/book              - Public booking page (no auth)
/login             - Staff login
/dashboard         - Course & slot management
/dashboard/bookings - Booking management + no-show charging

Edge Functions:
- create-setup-intent  - Creates Stripe Customer + SetupIntent
- confirm-booking      - Validates capacity, creates booking record
- charge-no-show       - Charges saved payment method off-session
```

## RLS Policies

- **courses/slots**: Anyone can read, only authenticated users can modify
- **bookings**: Anonymous users can insert (book), only authenticated users can read/update/delete
- Edge functions use `service_role` key which bypasses RLS
