export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ArztProfile } from "./arzt-profile";

export default async function MobileArztDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: azubi } = await supabase
    .from("auszubildende")
    .select("*")
    .eq("id", id)
    .single();

  if (!azubi) notFound();

  const { data: bookings } = await supabase
    .from("course_bookings")
    .select(
      "*, course_sessions(date_iso, label_de, instructor_name), course_templates:template_id(title, course_label_de)"
    )
    .eq("auszubildende_id", id)
    .order("created_at", { ascending: false });

  return <ArztProfile azubi={azubi} bookings={bookings ?? []} />;
}
