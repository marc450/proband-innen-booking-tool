import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "./nav";

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

  // Read role from cookie (set by middleware) — no DB call needed
  const cookieStore = await cookies();
  const role = (cookieStore.get("x-user-role")?.value ?? "admin") as "admin" | "dozent";

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav userEmail={session.user.email || ""} role={role} />
      <main className="max-w-screen-xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
