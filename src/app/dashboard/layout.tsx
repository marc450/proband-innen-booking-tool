import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "./nav";
import { DashboardBodyTheme } from "./body-theme";
import { SuppressPasswordManagers } from "./suppress-password-managers";

export const metadata: Metadata = {
  title: "EPHIA Admin",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // getSession() reads the JWT from the cookie locally — no network call.
  // The middleware already validated the user with getUser(), so this is safe.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  // Read role + flags from cookies (set by middleware) — no DB call needed
  const cookieStore = await cookies();
  const role = (cookieStore.get("x-user-role")?.value ?? "admin") as "admin" | "nutzer";
  const isKursbetreuung = cookieStore.get("x-is-kursbetreuung")?.value === "1";
  const theme = (cookieStore.get("x-theme")?.value ?? "light") as "light" | "dark";

  return (
    <div
      data-dashboard-root
      style={{ backgroundColor: "var(--dashboard-bg)" }}
      className={`min-h-screen text-foreground ${theme === "dark" ? "dark" : ""}`}
    >
      <DashboardBodyTheme theme={theme} />
      <SuppressPasswordManagers />
      <DashboardNav
        userEmail={session.user.email || ""}
        role={role}
        isKursbetreuung={isKursbetreuung}
        theme={theme}
      />
      <main className="ml-14 px-8 py-6">{children}</main>
    </div>
  );
}
