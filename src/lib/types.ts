export type BookingStatus = "booked" | "attended" | "no_show" | "cancelled";

export interface Course {
  id: string;
  title: string;
  description: string | null;
  course_date: string | null; // ISO date string yyyy-MM-dd
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
  created_at: string;
  updated_at: string;
}

export interface PatientWithBookings extends Patient {
  bookings: BookingWithDetails[];
}

export interface BookingWithDetails extends Booking {
  slots: {
    start_time: string;
    end_time: string;
    courses: {
      title: string;
    };
  };
}
