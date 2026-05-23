import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildCourseProgramPdf,
  hasProgramTemplate,
} from "@/lib/course-program-pdf";

export const dynamic = "force-dynamic";

async function assertStaff(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin" || profile?.role === "nutzer";
}

function safeFilename(input: string): string {
  return input
    .replace(/[^\p{L}\p{N}._-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export async function GET(req: NextRequest) {
  if (!(await assertStaff())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: session, error } = await admin
    .from("course_sessions")
    .select(
      "id, date_iso, start_time, address, instructor_name, template_id, course_templates:template_id(title, course_label_de, description, course_key)",
    )
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const template = Array.isArray(session.course_templates)
    ? session.course_templates[0]
    : (session.course_templates as
        | {
            title: string | null;
            course_label_de: string | null;
            description: string | null;
            course_key: string | null;
          }
        | null);

  const courseKey = template?.course_key ?? null;
  if (!hasProgramTemplate(courseKey)) {
    return NextResponse.json(
      { error: "no program template registered for this course type" },
      { status: 400 },
    );
  }

  const title = template?.course_label_de || template?.title || "Praxiskurs";
  const description = template?.description?.trim() || "";
  const startTime = (session.start_time as string | null) || "10:00";

  // Match course_sessions.instructor_name back to a Dozent:in profile
  // to recover Fachgebiet + Arbeitgeber. instructor_name is free text
  // assembled as `[title, first_name, last_name].filter().join(" ")`
  // in the session editor, so we rebuild the same string for each
  // is_dozent profile and look for an exact match. Falls back to just
  // the name if no match is found (legacy sessions, manual entries).
  let instructorLine =
    (session.instructor_name as string | null)?.trim() || "Dozent:in offen";
  if (session.instructor_name) {
    const { data: dozenten } = await admin
      .from("profiles")
      .select("title, first_name, last_name, dozent_employer, dozent_specialization")
      .eq("is_dozent", true);
    const target = (session.instructor_name as string).trim();
    const match = (dozenten ?? []).find((d) => {
      const composed = [d.title, d.first_name, d.last_name]
        .filter((s): s is string => !!s && s.trim().length > 0)
        .join(" ")
        .trim();
      return composed === target;
    });
    if (match) {
      const parts: string[] = [];
      const name = [match.first_name, match.last_name]
        .filter((s): s is string => !!s && s.trim().length > 0)
        .join(" ")
        .trim();
      if (name) parts.push(name);
      if (match.dozent_specialization?.trim()) parts.push(match.dozent_specialization.trim());
      if (match.dozent_employer?.trim()) parts.push(match.dozent_employer.trim());
      if (parts.length) instructorLine = parts.join(", ");
    }
  }

  const pdfBytes = await buildCourseProgramPdf({
    courseKey: courseKey as string,
    title,
    dateIso: session.date_iso as string,
    description,
    startTime,
    instructorLine,
    address: (session.address as string | null) ?? null,
  });

  const [y, m, d] = (session.date_iso as string).split("-");
  const filename = safeFilename(`Programm ${title} ${d}.${m}.${y}`) + ".pdf";

  return new NextResponse(new Uint8Array(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
