import type { Metadata } from "next";

// The login page is a client component and can't export metadata itself.
// Without this it fell back to the root layout's "EPHIA Booking", which is
// the public funnel's title, not the staff tool's. /dashboard already
// titles itself "EPHIA Admin" — this makes the way in match.
export const metadata: Metadata = {
  title: "EPHIA Admin",
  robots: { index: false, follow: false },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
