// Signals user activity to the inactivity-logout timer for long-running
// operations that aren't keyboard/mouse input (e.g. an in-progress
// upload). InactivityLogout listens for this event and resets its idle
// clock, so a multi-minute upload doesn't get the user logged out.
export const ACTIVITY_EVENT = "ephia:activity";

export function pingActivity() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACTIVITY_EVENT));
  }
}
