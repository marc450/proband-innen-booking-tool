// Profile-completion URL builder.
//
// Mirrors the URL emitted by sendProfileReminderEmail in lib/post-purchase.ts
// so a link copied from the dashboard lands on exactly the same screen the
// reminder email points to. Kept in its own module so the auszubildende
// detail page and the course-bookings list can share it without dragging
// in the rest of post-purchase.ts (LearnWorlds, HubSpot, Resend, …).

const DEFAULT_BASE_URL = "https://proband-innen.ephia.de";

export function buildProfileCompletionUrl(
  bookingId: string,
  email: string,
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_BASE_URL;
  return `${baseUrl}/courses/success?booking_id=${bookingId}&email=${encodeURIComponent(email)}`;
}
