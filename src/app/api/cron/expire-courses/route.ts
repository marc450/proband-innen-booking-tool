import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Protected with a secret token — set CRON_SECRET in Railway environment variables
// Recommended schedule: 0 22 * * * (UTC) = midnight German time
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

  // 1. Proband:innen courses — go offline the morning AFTER their date
  //    (slots already close 30 min before start_time at query level)
  //    Uses lt = strictly before today, so course stays "Live" on its own day
  const { data: expiredCourses, error: coursesError } = await supabase
    .from("courses")
    .update({ status: "offline" })
    .lt("course_date", today)
    .eq("status", "online")
    .select("id, title, course_date");

  if (coursesError) {
    console.error("expire-courses error:", coursesError);
    return NextResponse.json({ error: coursesError.message }, { status: 500 });
  }

  // 2. Auszubildende course sessions — go offline on the day itself
  //    Uses lte = today and earlier, so session goes offline as soon as date_iso = today
  const { data: expiredSessions, error: sessionsError } = await supabase
    .from("course_sessions")
    .update({ is_live: false })
    .lte("date_iso", today)
    .eq("is_live", true)
    .select("id, date_iso");

  if (sessionsError) {
    console.error("expire-sessions error:", sessionsError);
    return NextResponse.json({ error: sessionsError.message }, { status: 500 });
  }

  console.log(
    `expire-courses: ${expiredCourses?.length ?? 0} course(s) offline, ` +
    `${expiredSessions?.length ?? 0} session(s) offline`
  );

  return NextResponse.json({
    courses_expired: expiredCourses?.length ?? 0,
    sessions_expired: expiredSessions?.length ?? 0,
  });
}
