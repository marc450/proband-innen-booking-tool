// Minimum online-course completion (in percent) a participant must reach
// to attend the practical day. Single source of truth: the dashboard
// badge, the pre-praxis reminder email, the booking confirmation email,
// and the customer profile all read this constant so the number can
// never drift between surfaces.
//
// Zero dependencies on purpose — safe to import from both client
// components (profile view, dashboard badge) and server code (email
// templates, cron) without pulling any Node-only modules into the
// client bundle.
export const ONLINE_COURSE_MIN_PCT = 90;
