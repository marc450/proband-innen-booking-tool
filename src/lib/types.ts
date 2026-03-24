export type BookingStatus = "booked" | "attended" | "no_show" | "cancelled";

export interface Course {
  id: string;
  title: string;
  description: string | null;
  course_date: string | null; // ISO date string yyyy-MM-dd
  location: string | null;
  instructor: string | null;
  guide_price: string | null;
  service_description: string | null;
  image_url: string | null;
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
    };
  };
}
