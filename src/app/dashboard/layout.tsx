import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedClaims } from "@/lib/supabase/claims";
import { redirect } from "next/navigation";
import { DashboardNav } from "./nav";
import { DashboardBodyTheme } from "./body-theme";
import { SuppressPasswordManagers } from "./suppress-password-managers";
import { InactivityLogout } from "@/components/auth/inactivity-logout";

export const metadata: Metadata = {
  title: "EPHIA Admin",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Verified claims rather than getSession(): the signature is checked
  // locally against the cached JWKS, so this costs no round trip and doesn't
  // emit auth-js's "may not be authentic" warning on every navigation.
  const claims = await getVerifiedClaims(supabase);

  if (!claims) {
    redirect("/login");
  }

  // Read role + flags from cookies (set by middleware) — no DB call needed
  const cookieStore = await cookies();
  const role = (cookieStore.get("x-user-role")?.value ?? "nutzer") as "admin" | "nutzer";
  const isKursbetreuung = cookieStore.get("x-is-kursbetreuung")?.value === "1";
  const isAutor = cookieStore.get("x-is-autor")?.value === "1";
  const theme = (cookieStore.get("x-theme")?.value ?? "light") as "light" | "dark";

  return (
    <div
      data-dashboard-root
      style={{ backgroundColor: "var(--dashboard-bg)" }}
      className={`min-h-screen text-foreground ${theme === "dark" ? "dark" : ""}`}
    >
      <DashboardBodyTheme theme={theme} />
      <SuppressPasswordManagers />
      <InactivityLogout />
      <DashboardNav
        userEmail={(claims.email as string | undefined) || ""}
        role={role}
        isKursbetreuung={isKursbetreuung}
        isAutor={isAutor}
        theme={theme}
      />
      <main className="ml-14 px-8 py-6">{children}</main>
    </div>
  );
}
