// Profile-completion URL builder.
//
// Mirrors the URL emitted by sendProfileReminderEmail in lib/post-purchase.ts
// so a link copied from the dashboard lands on exactly the same screen the
// reminder email points to. Kept in its own module so the auszubildende
// detail page and the course-bookings list can share it without dragging
// in the rest of post-purchase.ts (LearnWorlds, HubSpot, Resend, …).
//
// Hardcoded to ephia.de because this URL is doctor-facing. The
// proband-innen subdomain reads as patient-facing and looks wrong in
// onboarding emails to physicians. Old links that still point at
// proband-innen.ephia.de continue to work via a 308 redirect in
// middleware.ts.

const DOCTOR_HOST = "https://ephia.de";

export function buildProfileCompletionUrl(
  bookingId: string,
  email: string,
): string {
  return `${DOCTOR_HOST}/courses/success?booking_id=${bookingId}&email=${encodeURIComponent(email)}`;
}
