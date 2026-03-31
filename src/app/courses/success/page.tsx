export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { SuccessContent } from "./success-content";

interface Props {
  searchParams: Promise<{ session_id?: string; booking_id?: string; email?: string }>;
}

export default async function CourseSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = createAdminClient();

  let booking = null;
  let profileComplete = false;

  // Route 1: From Stripe redirect (session_id)
  if (params.session_id) {
    const { data } = await supabase
      .from("course_bookings")
      .select("id, email, first_name, last_name, course_type, template_id, session_id, stripe_checkout_session_id, amount_paid, audience_tag, profile_complete, auszubildende_id")
      .eq("stripe_checkout_session_id", params.session_id)
      .maybeSingle();

    booking = data;
  }

  // Route 2: From reminder email (booking_id + email)
  if (!booking && params.booking_id && params.email) {
    const { data } = await supabase
      .from("course_bookings")
      .select("id, email, first_name, last_name, course_type, template_id, session_id, stripe_checkout_session_id, amount_paid, audience_tag, profile_complete, auszubildende_id")
      .eq("id", params.booking_id)
      .eq("email", params.email)
      .maybeSingle();

    booking = data;
  }

  // Check if auszubildende profile is already complete
  if (booking?.auszubildende_id) {
    const { data: azubi } = await supabase
      .from("auszubildende")
      .select("profile_complete")
      .eq("id", booking.auszubildende_id)
      .single();

    if (azubi?.profile_complete) {
      profileComplete = true;
    }
  }

  if (booking?.profile_complete) {
    profileComplete = true;
  }

  return (
    <div className="min-h-screen bg-[#FAEBE1] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img
            src="https://lwfiles.mycourse.app/6638baeec5c56514e03ec360-public/f64a1ea1eb5346a171fe9ea36e8615ca.png"
            alt="EPHIA"
            className="h-12 mx-auto"
          />
        </div>
        <SuccessContent
          booking={booking ? {
            id: booking.id,
            email: booking.email,
            firstName: booking.first_name,
            lastName: booking.last_name,
            courseType: booking.course_type,
            templateId: booking.template_id,
            sessionId: booking.session_id,
            amountPaid: booking.amount_paid,
            audienceTag: booking.audience_tag,
            auszubildendeId: booking.auszubildende_id,
          } : null}
          profileComplete={profileComplete}
        />
      </div>
    </div>
  );
}
