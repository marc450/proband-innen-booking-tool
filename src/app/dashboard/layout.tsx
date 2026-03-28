import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "./nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // No profile = original admin (created before profiles table)
  const role = (profile?.role ?? "admin") as "admin" | "dozent";

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav userEmail={user.email || ""} role={role} />
      <main className="max-w-screen-xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
