import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BottomTabBar } from "./bottom-tab-bar";

export const metadata = {
  title: "EPHIA Mobile",
};

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const role = (cookieStore.get("x-user-role")?.value ?? "admin") as
    | "admin"
    | "nutzer";

  return (
    <div
      className="min-h-dvh text-foreground pb-24"
      style={{ backgroundColor: "#F5F5F5" }}
      data-role={role}
    >
      <main className="px-4 pt-4">{children}</main>
      <BottomTabBar />
    </div>
  );
}
