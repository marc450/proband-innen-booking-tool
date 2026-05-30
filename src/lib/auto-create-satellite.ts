import { createAdminClient } from "@/lib/supabase/admin";
import { resolveInstructorIdFromName } from "@/lib/resolve-instructor-id";

// Builds a Berlin-local timestamp string ("YYYY-MM-DDTHH:MM:00+HH:MM").
// Computes the correct Berlin offset for the given date (CET vs CEST)
// via Intl, so DST is handled without an external dependency.
function buildBerlinTimestamp(dateIso: string, hhmm: string): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    timeZoneName: "longOffset",
  });
  const parts = fmt.formatToParts(new Date(`${dateIso}T12:00:00Z`));
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+01:00";
  const offset = raw.replace("GMT", "") || "+01:00";
  return `${dateIso}T${hhmm}:00${offset}`;
}

// course_key fallbacks for templates that have never had a Proband:innen
// satellite before. Confirmed by Marc: aufbaukurs_lippen borrows from
// grundkurs_dermalfiller until it has its own historical pattern.
const PATTERN_FALLBACKS: Record<string, string> = {
  aufbaukurs_lippen: "grundkurs_dermalfiller",
};

interface SourceSlot {
  offset_minutes: number;
  capacity: number;
}

interface PatternLookup {
  source: "pattern" | "lippen-fallback" | null;
  slots: SourceSlot[];
}

// Find the slot pattern to apply: most-recent linked satellite for the
// same template (preferring one whose source session shares the new
// session's start_time, since admin sometimes trims slots for evening
// sessions); falls back by course_key when the template has never had
// a satellite. Returns offset minutes computed from the historical
// session's start_time so the pattern is portable to any future session.
async function lookupPattern(
  templateId: string,
  templateCourseKey: string | null,
  targetStartTime: string,
): Promise<PatternLookup> {
  const admin = createAdminClient();

  const tryTemplate = async (id: string): Promise<SourceSlot[] | null> => {
    // First pass: strict match on session.start_time so a 15:30 source
    // wins over a 10:00 source for a new 15:30 session.
    const findCandidate = async (filterByStart: boolean) => {
      let query = admin
        .from("courses")
        .select("id, session_id, course_sessions!inner(start_time)")
        .eq("template_id", id)
        .not("session_id", "is", null);
      if (filterByStart) {
        query = query.eq("course_sessions.start_time", targetStartTime);
      }
      return query
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{
          id: string;
          session_id: string;
          course_sessions: { start_time: string | null } | null;
        }>();
    };

    let { data: candidate } = await findCandidate(true);
    if (!candidate) {
      ({ data: candidate } = await findCandidate(false));
    }
    if (!candidate || !candidate.course_sessions?.start_time) return null;

    const sessionStartHhmm = candidate.course_sessions.start_time;
    const [sh, sm] = sessionStartHhmm.split(":").map(Number);
    const sessionStartMin = sh * 60 + sm;

    const { data: slotRows } = await admin
      .from("slots")
      .select("start_time, capacity")
      .eq("course_id", candidate.id)
      .order("start_time", { ascending: true });
    if (!slotRows || slotRows.length === 0) return null;

    const offsets: SourceSlot[] = [];
    for (const row of slotRows) {
      const slotDate = new Date(row.start_time as string);
      // Read the slot's clock time in Berlin and turn it into "minutes
      // past midnight Berlin", then subtract the session's start.
      const berlinHhmm = slotDate.toLocaleString("en-GB", {
        timeZone: "Europe/Berlin",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const [bh, bm] = berlinHhmm.split(":").map(Number);
      const slotStartMin = bh * 60 + bm;
      offsets.push({
        offset_minutes: slotStartMin - sessionStartMin,
        capacity: (row.capacity as number) ?? 1,
      });
    }
    return offsets;
  };

  // Direct match.
  const direct = await tryTemplate(templateId);
  if (direct) return { source: "pattern", slots: direct };

  // Fallback by course_key.
  if (templateCourseKey && PATTERN_FALLBACKS[templateCourseKey]) {
    const fallbackKey = PATTERN_FALLBACKS[templateCourseKey];
    const { data: fallbackTemplate } = await admin
      .from("course_templates")
      .select("id")
      .eq("course_key", fallbackKey)
      .maybeSingle();
    if (fallbackTemplate) {
      const borrowed = await tryTemplate(fallbackTemplate.id as string);
      if (borrowed) return { source: "lippen-fallback", slots: borrowed };
    }
  }

  return { source: null, slots: [] };
}

export type SatelliteResult =
  | {
      ok: true;
      sessionId: string;
      courseId: string | null;
      slotsCreated: number;
      patternSource: "pattern" | "lippen-fallback";
      preview?: { slotTimestamps: string[] };
    }
  | { ok: false; sessionId: string; reason: string };

// Create the Proband:innen satellite course (and slots) for a given
// course_session. Idempotent: refuses to create if the session already
// has a satellite. Used by both the dashboard auto-create handler and
// the one-shot backfill API.
export async function createSatelliteForSession(
  sessionId: string,
  options: { dryRun?: boolean } = {},
): Promise<SatelliteResult> {
  const admin = createAdminClient();

  // Already linked?
  const { data: existing } = await admin
    .from("courses")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (existing) {
    return { ok: false, sessionId, reason: "already has a satellite" };
  }

  const { data: session } = await admin
    .from("course_sessions")
    .select("id, template_id, date_iso, start_time, duration_minutes, address, instructor_name")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) {
    return { ok: false, sessionId, reason: "session not found" };
  }
  if (!session.start_time) {
    return { ok: false, sessionId, reason: "session has no start_time; cannot place slots" };
  }

  const { data: template } = await admin
    .from("course_templates")
    .select("id, course_key, title, treatment_title, description, service_description, guide_price_cents, image_url")
    .eq("id", session.template_id)
    .maybeSingle();
  if (!template) {
    return { ok: false, sessionId, reason: "template not found" };
  }

  const lookup = await lookupPattern(
    template.id as string,
    template.course_key as string | null,
    session.start_time as string,
  );
  if (!lookup.source) {
    return { ok: false, sessionId, reason: "no source pattern available for this template" };
  }

  // Trim slots that don't fit the new session's duration window.
  const duration = (session.duration_minutes as number | null) ?? 0;
  const slots = duration > 0
    ? lookup.slots.filter((s) => s.offset_minutes <= duration)
    : lookup.slots;

  // Compute the absolute Berlin-local timestamp for each slot.
  const sessionStart = session.start_time as string;
  const [sh, sm] = sessionStart.split(":").map(Number);
  const sessionStartMin = sh * 60 + sm;
  const slotTimestamps: string[] = slots.map((s) => {
    const total = sessionStartMin + s.offset_minutes;
    const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    return buildBerlinTimestamp(session.date_iso as string, `${hh}:${mm}`);
  });

  if (options.dryRun) {
    return {
      ok: true,
      sessionId,
      courseId: null,
      slotsCreated: slots.length,
      patternSource: lookup.source,
      preview: { slotTimestamps },
    };
  }

  // Resolve instructor: course_sessions stores instructor_name as text;
  // resolveInstructorIdFromName does a forgiving lookup (title-blind
  // fallbacks, no is_dozent gate) so satellite courses get a populated
  // instructor_id even when the doctor's profile title drifted from the
  // string the admin typed.
  const instructorId = await resolveInstructorIdFromName(
    admin,
    session.instructor_name as string | null,
  );

  // Insert satellite course.
  const { data: newCourse, error: courseErr } = await admin
    .from("courses")
    .insert({
      session_id: sessionId,
      template_id: template.id,
      title: template.title,
      treatment_title: template.treatment_title || null,
      description: template.description || null,
      service_description: template.service_description || null,
      guide_price_cents: template.guide_price_cents,
      image_url: template.image_url || null,
      course_date: session.date_iso,
      location: session.address || null,
      instructor_id: instructorId,
      status: "published",
    })
    .select("id")
    .single();
  if (courseErr || !newCourse) {
    return { ok: false, sessionId, reason: courseErr?.message || "satellite insert failed" };
  }

  // Insert slots.
  if (slots.length > 0) {
    const slotRows = slots.map((s, i) => ({
      course_id: newCourse.id,
      start_time: slotTimestamps[i],
      capacity: s.capacity,
    }));
    const { error: slotsErr } = await admin.from("slots").insert(slotRows);
    if (slotsErr) {
      return { ok: false, sessionId, reason: `slots insert failed: ${slotsErr.message}` };
    }

    // Grundkurs Botulinum: seed the default masseter baseline (reserve the
    // free 3rd/4th-last slots). reconcile_masseter_reservation gates on
    // course_key itself, so this is a no-op for any other course type.
    if ((template.course_key as string | null)?.startsWith("grundkurs_botulinum")) {
      const { error: reconcileErr } = await admin.rpc("reconcile_masseter_reservation", {
        p_course_id: newCourse.id,
      });
      if (reconcileErr) {
        console.error("masseter baseline seed failed", reconcileErr);
      }
    }
  }

  return {
    ok: true,
    sessionId,
    courseId: newCourse.id as string,
    slotsCreated: slots.length,
    patternSource: lookup.source,
  };
}
