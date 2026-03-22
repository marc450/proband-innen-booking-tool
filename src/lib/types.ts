export type BookingStatus = "booked" | "attended" | "no_show" | "cancelled";

export interface Course {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

export interface Slot {
  id: string;
  course_id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  created_at: string;
}

export interface AvailableSlot extends Slot {
  course_title: string;
  course_description: string | null;
  remaining_capacity: number;
}

export interface Booking {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  status: BookingStatus;
  charge_id: string | null;
  created_at: string;
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
