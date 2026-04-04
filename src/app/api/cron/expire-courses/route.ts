import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Protected with a secret token — set CRON_SECRET in Railway environment variables
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split("T")[0]; // yyyy-MM-dd

  const { data, error } = await supabase
    .from("courses")
    .update({ status: "offline" })
    .lte("course_date", today)
    .eq("status", "online")
    .select("id, title, course_date");

  if (error) {
    console.error("expire-courses cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`expire-courses: set ${data?.length ?? 0} course(s) to offline`);
  return NextResponse.json({ expired: data?.length ?? 0, courses: data });
}
