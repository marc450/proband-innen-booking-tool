export interface CourseTemplate {
  id: string;
  title: string;
  treatment_title: string | null;
  description: string | null;
  service_description: string | null;
  guide_price: string | null;
  image_url: string | null;
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
  created_at: string;
}

export type PatientStatus = "active" | "warning" | "blacklist";

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
  created_at: string;
  updated_at: string;
}

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";

export interface EmailCampaign {
  id: string;
  course_id: string | null;
  subject: string;
  body_text: string;
  recipient_count: number;
  excluded_patient_ids: string[];
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
      instructor: string | null;
    };
  };
}
