export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RechnungenManager } from "./rechnungen-manager";
import type { Auszubildende } from "@/lib/types";

export default async function RechnungenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile && profile.role !== "admin") redirect("/dashboard");

  const adminClient = createAdminClient();
  const { data: auszubildende } = await adminClient
    .from("auszubildende")
    .select("id, first_name, last_name, email, phone, title")
    .order("last_name", { ascending: true });

  return <RechnungenManager initialAuszubildende={(auszubildende ?? []) as Pick<Auszubildende, "id" | "first_name" | "last_name" | "email" | "phone" | "title">[]} />;
}
