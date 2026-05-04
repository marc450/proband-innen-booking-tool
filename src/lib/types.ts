export interface CourseTemplate {
  id: string;
  title: string;
  treatment_title: string | null;
  description: string | null;
  service_description: string | null;
  guide_price: string | null;
  image_url: string | null;
  /**
   * Optional hero image shown only on Proband:innen-facing course cards
   * (`/kurse/werde-proband-in`, `/book/privat`). Falls back to `image_url`
   * when null.
   */
  image_url_probanden: string | null;
  instructor: string | null;
  created_at: string;
  // Auszubildende-specific fields (nullable for Proband:innen templates)
  course_key: string | null;
  course_label_de: string | null;
  name_online: string | null;
  name_praxis: string | null;
  name_kombi: string | null;
  price_gross_online: number | null;
  price_gross_praxis: number | null;
  price_gross_kombi: number | null;
  price_gross_premium: number | null;
  vat_rate_online: number | null;
  vat_rate_praxis: number | null;
  vat_rate_kombi: number | null;
  description_online: string | null;
  description_praxis: string | null;
  description_kombi: string | null;
  success_url_online: string | null;
  success_url_praxis: string | null;
  success_url_kombi: string | null;
  cancel_url_online: string | null;
  cancel_url_praxis: string | null;
  cancel_url_kombi: string | null;
  status: string | null;
  online_course_id: string | null;
  features_online: string[] | null;
  features_praxis: string[] | null;
  features_kombi: string[] | null;
  cme_online: string | null;
  cme_praxis: string | null;
  cme_kombi: string | null;
  // CME registration number for the online/theory portion. Stable per
  // course template for the year (Landesärztekammer Berlin). Stamped
  // onto the participation certificate at render time.
  vnr_theorie: string | null;
  // Marketing card badges — drive the audience + level pills on /kurse tiles.
  // audience: 'humanmediziner' | 'zahnmediziner' | 'alle' | null
  // level:    'einsteiger'     | 'fortgeschritten' | null
  audience: string | null;
  level: string | null;
  // Marketing card blurb shown below the title on /kurse course tiles.
  // Separate from `description` (Proband:innen booking page copy).
  card_description: string | null;
}

export type CourseType = "Onlinekurs" | "Praxiskurs" | "Kombikurs" | "Premium";
export type CourseBookingStatus = "booked" | "completed" | "cancelled" | "refunded";

export interface CourseSession {
  id: string;
  template_id: string;
  date_iso: string;
  label_de: string | null;
  instructor_name: string | null;
  betreuer_name: string | null;
  max_seats: number;
  booked_seats: number;
  address: string | null;
  start_time: string | null;
  duration_minutes: number | null;
  is_live: boolean;
  cme_status: string | null;
  has_zahnmedizin: boolean;
  // CME registration number for this specific practical course session.
  // Changes per session (each run gets its own VNR from the LÄK Berlin).
  // Stamped onto the participation certificate at render time.
  vnr_praxis: string | null;
  created_at: string;
}

export interface CourseBooking {
  id: string;
  session_id: string | null;
  template_id: string;
  course_type: CourseType;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  stripe_checkout_session_id: string | null;
  stripe_customer_id: string | null;
  amount_paid: number | null;
  status: CourseBookingStatus;
  audience_tag: string | null;
  bundle_group_id: string | null;
  created_at: string;
}

export interface Dozent {
  id: string;
  title: string | null;
  first_name: string;
  last_name: string;
  created_at: string;
}

// User with Dozent:in role — sourced from profiles table
export interface DozentUser {
  id: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
}

export type BookingStatus = "booked" | "attended" | "no_show" | "cancelled";

export interface Course {
  id: string;
  template_id: string | null;
  title: string;
  treatment_title: string | null;
  description: string | null;
  course_date: string | null; // ISO date string yyyy-MM-dd
  location: string | null;
  instructor: string | null;
  guide_price: string | null;
  service_description: string | null;
  image_url: string | null;
  status: "online" | "offline";
  created_at: string;
}

export interface Slot {
  id: string;
  course_id: string;
  start_time: string;
  end_time: string | null;
  capacity: number;
  blocked: boolean;
  blocked_note: string | null;
  created_at: string;
}

export interface AvailableSlot extends Slot {
  course_title: string;
  course_description: string | null;
  course_date: string | null;
  remaining_capacity: number;
}

export interface Booking {
  id: string;
  slot_id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  stripe_checkout_session_id: string | null;
  status: BookingStatus;
  charge_id: string | null;
  patient_id?: string | null;
  booking_type?: string;
  referring_doctor?: string;
  // Per-booking notes, encrypted in encrypted_data alongside the rest
  // of the PII. Distinct from patients.notes which follows the
  // patient across all their bookings; this captures session-specific
  // observations ("kam zu spät", "Behandlung abgebrochen", etc.).
  notes: string | null;
  created_at: string;
}

export type PatientStatus = "active" | "warning" | "blacklist" | "inactive";

export interface Patient {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  stripe_customer_id: string | null;
  patient_status: PatientStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientWithBookings extends Patient {
  bookings: BookingWithDetails[];
}

export interface Auszubildende {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  title: string | null;
  gender: string | null;
  specialty: string | null;
  birthdate: string | null;
  efn: string | null;
  profile_complete: boolean;
  contact_type: "auszubildende" | "proband" | "other" | "company" | null;
  company_name: string | null;
  vat_id: string | null;
  address_line1: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  address_country: string | null;
  // Set by /api/auth/set-password when the customer creates a Supabase
  // login. NULL means no login account exists yet — admin password
  // tooling can show "noch nicht aktiviert" and disable actions.
  user_id: string | null;
  // Populated by the LW user import (migration 051). Used by
  // /mein-konto for the LW progress fetch and (later) by the admin
  // cancel-booking flow.
  lw_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";

export interface EmailCampaign {
  id: string;
  name: string | null;
  course_id: string | null;
  subject: string;
  body_text: string;
  content_blocks: unknown;
  recipient_count: number;
  recipient_emails: string[] | null;
  excluded_patient_ids: string[];
  audience_type: string | null;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface BookingWithDetails extends Booking {
  slots: {
    course_id: string;
    start_time: string;
    end_time: string;
    courses: {
      title: string;
      // Optional because several list/detail queries still select only
      // { title, instructor } — the patient-facing emails live behind
      // the bookings-page query which does fetch treatment_title.
      treatment_title?: string | null;
      instructor: string | null;
    };
  };
}

// ── Merch shop ───────────────────────────────────────────────────────

export interface MerchProduct {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  /** Primary / hero image. */
  image_url: string | null;
  /** Optional additional images (up to 2 more, migration 037). Rendered as
   *  thumbnails on the product detail page that swap the hero on click. */
  image_url_2: string | null;
  image_url_3: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MerchProductVariant {
  id: string;
  product_id: string;
  name: string;
  color: string | null;
  size: string | null;
  sku: string | null;
  price_gross_cents: number;
  vat_rate: number;
  stock: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type MerchOrderStatus = "pending" | "paid" | "shipped" | "cancelled" | "refunded";

export interface MerchOrder {
  id: string;
  variant_id: string | null;
  product_id: string | null;
  product_title: string;
  variant_name: string | null;
  variant_color: string | null;
  variant_size: string | null;
  quantity: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  is_doctor: boolean;
  auszubildende_id: string | null;
  shipping_line1: string | null;
  shipping_line2: string | null;
  shipping_postal_code: string | null;
  shipping_city: string | null;
  shipping_country: string | null;
  item_gross_cents: number;
  shipping_gross_cents: number;
  amount_paid_cents: number;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_url: string | null;
  status: MerchOrderStatus;
  tracking_number: string | null;
  shipped_at: string | null;
  created_at: string;
  updated_at: string;
}
