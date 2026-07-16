import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedClaims } from "@/lib/supabase/claims";
import { redirect } from "next/navigation";
import { BottomTabBar } from "./bottom-tab-bar";
import { SuppressPasswordManagers } from "@/app/dashboard/suppress-password-managers";
import { InactivityLogout } from "@/components/auth/inactivity-logout";

export const metadata = {
  title: "EPHIA Mobile",
};

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  // See the dashboard layout: verified claims, no round trip, no warning.
  const claims = await getVerifiedClaims(supabase);

  if (!claims) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const role = (cookieStore.get("x-user-role")?.value ?? "nutzer") as
    | "admin"
    | "nutzer";

  return (
    <div
      data-admin-root
      className="min-h-dvh text-foreground pb-24"
      style={{ backgroundColor: "#F5F5F5" }}
      data-role={role}
    >
      <SuppressPasswordManagers />
      <InactivityLogout />
      <main className="px-4 pt-4">{children}</main>
      <BottomTabBar />
    </div>
  );
}
